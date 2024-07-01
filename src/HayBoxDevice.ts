import { Buffer } from "buffer";
import { decode as cobsDecode, encode as cobsEncode } from "./cobs";
import { Command, Config, DeviceInfo } from "./proto/config_pb";

class HayBoxDevice {
    serialPort: SerialPort | null;

    constructor(serialPort: SerialPort) {
        this.serialPort = serialPort;
    }

    public async getDeviceInfo() {
        console.log("Sending GET_DEVICE_INFO");
        try {
            await this.openSerialPort();
        } catch (ex) {
            console.log(`Failed to open serial port: ${ex}`);
            return null;
        }

        let response: Uint8Array | null = null;
        try {
            if (await this.writePacket(Command.CMD_GET_DEVICE_INFO)) {
                response = await this.readPacket();
            }
        } finally {
            await this.closeSerialPort();
        }

        if (response == null || response.length <= 0) {
            return null;
        }
        if (response[0] === Command.CMD_SET_DEVICE_INFO) {
            return DeviceInfo.fromBinary(response.slice(1));
        } else if (response[0] === Command.CMD_ERROR) {
            this.printError(response);
        }

        return null;
    }

    public async getConfig() {
        console.log("Sending GET_CONFIG");
        try {
            await this.openSerialPort();
        } catch (ex) {
            console.log(`Failed to open serial port: ${ex}`);
            return null;
        }

        let response: Uint8Array | null = null;
        try {
            if (await this.writePacket(Command.CMD_GET_CONFIG)) {
                response = await this.readPacket();
            }
        } finally {
            await this.closeSerialPort();
        }

        if (response == null || response.length <= 0) {
            return null;
        }
        if (response[0] === Command.CMD_SET_CONFIG) {
            return Config.fromBinary(response.slice(1));
        } else if (response[0] === Command.CMD_ERROR) {
            this.printError(response);
        }
    }

    public async setConfig(config: Config) {
        console.log("Sending SET_CONFIG");
        try {
            await this.openSerialPort();
        } catch (ex) {
            console.log(`Failed to open serial port: ${ex}`);
            return false;
        }

        let response: Uint8Array | null = null;
        try {
            if (await this.writePacket(Command.CMD_SET_CONFIG, config.toBinary())) {
                response = await this.readPacket();
            }
        } finally {
            await this.closeSerialPort();
        }

        if (response == null || response.length <= 0) {
            return false;
        } else if (response[0] === Command.CMD_ERROR) {
            this.printError(response);
        } else if (response[0] == Command.CMD_SUCCESS) {
            console.log("Config updated successfully");
            return true;
        }

        return false;
    }

    public async rebootFirmware() {
        console.log("Sending CMD_REBOOT_FIRMWARE");
        try {
            await this.openSerialPort();
        } catch (ex) {
            console.log(`Failed to open serial port: ${ex}`);
            return null;
        }

        try {
            await this.writePacket(Command.CMD_REBOOT_FIRMWARE);
        } finally {
            await this.closeSerialPort();
        }
    }

    public async rebootBootloader() {
        console.log("Sending CMD_REBOOT_BOOTLOADER");
        try {
            await this.openSerialPort();
        } catch (ex) {
            console.log(`Failed to open serial port: ${ex}`);
            return null;
        }

        try {
            await this.writePacket(Command.CMD_REBOOT_BOOTLOADER);
        } finally {
            await this.closeSerialPort();
        }
    }

    private async readPacket(): Promise<Uint8Array | null> {
        const reader = this.serialPort?.readable?.getReader();
        if (reader == null) {
            return null;
        }

        let rawData = Buffer.alloc(0);

        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    break;
                }

                rawData = Buffer.concat([rawData, value]);

                if (value == null || value[value.length - 1] === 0) {
                    await reader.cancel();
                    break;
                }
            }
        } catch (ex) {
            console.log(`Error reading packet: ${ex}`);
        } finally {
            reader.releaseLock();
        }

        const decodedData = cobsDecode(rawData);
        return decodedData.subarray(0, decodedData.length - 1);
    }

    private async writePacket(commandId: number, arg?: Uint8Array) {
        const writer = this.serialPort?.writable?.getWriter();
        if (writer == null) {
            return false;
        }

        try {
            let rawData = Buffer.from([commandId]);
            if (arg != null) {
                rawData = Buffer.concat([rawData, arg]);
            }

            const encodedData = cobsEncode(rawData);
            await writer.write(encodedData);
        } catch (ex) {
            console.log(`Error sending packet: ${ex}`);
        } finally {
            writer.releaseLock();
        }

        return true;
    }

    private async openSerialPort() {
        await this.serialPort?.open({ baudRate: 115200 });
    }

    private async closeSerialPort() {
        await this.serialPort?.close();
    }

    private printError(response: Uint8Array) {
        const errMsg = new TextDecoder().decode(response.slice(1));
        console.log(`Error: ${errMsg}`);
    }
}

export default HayBoxDevice;
