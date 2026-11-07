import { LoginResultResponse, SolixApi } from "./api";
import { anonymizeConfig, getConfig } from "./config";
import { consoleLogger } from "./logger";
import { sleep } from "./utils";
import { Publisher } from "./publish";
import { FilePersistence, Persistence } from "./persistence";

const config = getConfig();
const logger = consoleLogger(config.verbose);

function isLoginValid(loginData: LoginResultResponse, now: Date = new Date()) {
  return new Date(loginData.token_expires_at * 1000).getTime() > now.getTime();
}

async function run(): Promise<void> {
  logger.log(JSON.stringify(anonymizeConfig(config)));
  const api = new SolixApi({
    username: config.username,
    password: config.password,
    country: config.country,
    logger,
  });

  const persistence: Persistence<LoginResultResponse> = new FilePersistence(config.loginStore);

  const publisher = new Publisher(config.mqttUrl, config.mqttRetain, config.mqttClientId.length > 0 ? config.mqttClientId : undefined, config.mqttUsername, config.mqttPassword);
  async function fetchAndPublish(): Promise<void> {
    logger.log("Fetching data");
    let loginData = await persistence.retrieve();
    if (loginData == null || !isLoginValid(loginData)) {
      const loginResponse = await api.login();
      loginData = loginResponse.data ?? null;
      if (loginData) {
        await persistence.store(loginData);
      } else {
        logger.error(`Could not log in: ${loginResponse.msg} (${loginResponse.code})`);
      }
    } else {
      logger.log("Using cached auth data");
    }
    if (loginData) {
      const loggedInApi = api.withLogin(loginData);
      const siteHomepage = await loggedInApi.siteHomepage();
      let topic = `${config.mqttTopic}/site_homepage`;
      await publisher.publish(topic, siteHomepage.data);

      let sites;
      if (siteHomepage.data.site_list.length === 0) {
        // Fallback for Shared Accounts
        sites = (await loggedInApi.getSiteList()).data.site_list;
      } else {
        sites = siteHomepage.data.site_list;
      }
      for (const site of sites) {
        const scenInfo = await loggedInApi.scenInfo(site.site_id);
        topic = `${config.mqttTopic}/site/${site.site_name}/scenInfo`;
        await publisher.publish(topic, scenInfo.data);
      }

      // MI80 separat abfragen: Fehler dürfen die Solarbank-Daten nicht beeinträchtigen.
      try {
        const deviceResponse = await loggedInApi.getRelateAndBindDevices();
        const devices = deviceResponse.data?.data ?? [];
        const mi80 = devices.find(device => device.product_code === "A5143");

        if (mi80) {
          const pvResponse = await loggedInApi.getPvStatus(mi80.device_sn);
          const pvStatus = pvResponse.data?.pvStatuses?.[0];

          if (pvResponse.code === 0 && pvStatus) {
            const mi80Topic = `${config.mqttTopic}/mi80`;
            await publisher.publish(`${mi80Topic}/power`, pvStatus.power);
            await publisher.publish(`${mi80Topic}/status`, pvStatus.status);
            await publisher.publish(`${mi80Topic}/raw`, pvResponse.data);
            logger.log(`MI80 power: ${pvStatus.power} W`);
          } else {
            logger.warn(`MI80 API returned no valid PV status: ${pvResponse.msg} (${pvResponse.code})`);
          }
        } else {
          logger.log("No MI80 found in device list.");
        }
      } catch (e) {
        logger.warn("MI80 query or publishing failed; Solarbank data was already published.", e);
      }

      logger.log("Published.");
    } else {
      logger.error("Not logged in");
    }
  }

  for (;;) {
    const start = new Date().getTime();
    try {
      await fetchAndPublish();
    } catch (e) {
      logger.warn("Failed fetching or publishing printer data", e);
    }
    const end = new Date().getTime() - start;
    const sleepInterval = config.pollInterval * 1000 - end;
    logger.log(`Sleeping for ${sleepInterval}ms...`);
    await sleep(sleepInterval);
  }
}

run()
  .then(() => {
    logger.log("Done");
  })
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });
