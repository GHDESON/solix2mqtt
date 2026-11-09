# solix2mqtt

CLI tool to poll data from Anker SOLIX devices and publish it to an MQTT broker. This fork adds support for the Anker SOLIX MI80 microinverter alongside the Solarbank E1600.

## Description

This project is a read-only bridge between the API used by the Anker App and an MQTT broker.

## MI80 Microinverter

The MI80 is detected automatically from the Anker device list. Its current PV power and status are retrieved from the Anker API and published using the configured MQTT topic prefix (default: `solix`):

- `<topic-prefix>/mi80/power` – current power output in watts
- `<topic-prefix>/mi80/status` – device status reported by the API
- `<topic-prefix>/mi80/raw` – PV status response from the API

The existing Solarbank topics are unchanged. MI80 data is polled at the configured polling interval.

## Prerequisites

- **[Node.js](https://nodejs.org/)** – required to run the project.
- **npm** – included with the Node.js installation.

## Setup

1. Clone this fork and explicitly select the MI80 branch:

   ```bash
   git clone --branch mi80-support https://github.com/GHDESON/solix2mqtt.git
   ```

2. Navigate to the project directory:

   ```bash
   cd solix2mqtt
   ```

3. Install dependencies and build the application:

   ```bash
   npm install
   npm run build
   ```

The explicit branch selection ensures that you obtain the MI80-enabled version, even if the repository's default branch changes later.

## Usage

### Locally

Set the required environment variables for your Anker account and MQTT broker, then start the application:

```bash
S2M_USER=*** \
S2M_PASSWORD=*** \
S2M_COUNTRY=DE \
S2M_MQTT_URI=mqtt://localhost:1883 \
npm run start
```

Replace the placeholder values with your own settings. Do not publish your credentials or commit them to the repository.

### Docker

The Docker image referenced by the original project belongs to the upstream maintainer and may not include the MI80 changes in this fork. For MI80 support, build and run an image from this repository's `mi80-support` branch, or use the local Node.js setup above.

## Configuration

The application can be configured using the following environment variables:

- `S2M_USER` (required): Email address of your Anker account
- `S2M_PASSWORD` (required): Password of your Anker account
- `S2M_COUNTRY` (required): Two-letter country code (e.g. `DE`)
- `S2M_LOGIN_STORE` (optional): File used to cache authentication tokens (default: `auth.data`)
- `S2M_POLL_INTERVAL` (optional): Polling interval in seconds (default: `30`)
- `S2M_MQTT_URI` (required): MQTT broker URL (e.g. `mqtt://localhost:1883`)
- `S2M_MQTT_USERNAME` (optional): MQTT username
- `S2M_MQTT_PASSWORD` (optional): MQTT password
- `S2M_MQTT_CLIENT_ID` (optional): MQTT client identifier (default: `solix2mqtt`)
- `S2M_MQTT_TOPIC` (optional): Topic prefix for published data (default: `solix`)
- `S2M_MQTT_RETAIN` (optional): Set to `true` to publish retained MQTT messages (default: `false`)
- `S2M_VERBOSE` (optional): Set to `true` for more log output (default: `false`)

## Authentication

The application uses an authentication mechanism inspired by the one used in the Eufy ecosystem. The Anker App employs a two-step authentication scheme. The implementation used by this project may stop working if Anker changes its API or authentication mechanism.

For read-only access, an Anker account with which the system has been shared can be used. This allows the main account to continue controlling the system in the Anker app while the shared account is used for API access.

**Note:** Anker may permit only one simultaneous login at a time. Logging in from another device can invalidate previously generated authentication tokens.

## Disclaimer

This project is an independent, community-maintained fork of [tomquist/solix2mqtt](https://github.com/tomquist/solix2mqtt). It is not an official Anker project. The MI80 support was added in this fork and is provided without any guarantee. Contributions and issue reports are welcome.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [Original solix2mqtt project by Tom Quist](https://github.com/tomquist/solix2mqtt)
- [eufy-security-client](https://github.com/bropat/eufy-security-client) for authentication-related inspiration
