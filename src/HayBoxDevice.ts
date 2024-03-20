import { Buffer } from "buffer";
import { createBlockDecoder, createBlockEncoder } from "ucobs";
import { Command, Config, DeviceInfo } from "./proto/config";

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
            return DeviceInfo.decode(response.slice(1));
        } else if (response[0] === Command.CMD_ERROR) {
            console.log(`Error: ${response.slice(1)}`);
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
            return Config.decode(response.slice(1));
        } else if (response[0] === Command.CMD_ERROR) {
            console.log(`Error: ${response.slice(1)}`);
        }
    }

    public async setConfig(config: Config) {
        console.log("Sending SET_CONFIG");
        try {
            await this.openSerialPort();
        } catch (ex) {
            console.log(`Failed to open serial port: ${ex}`);
            return null;
        }

        let response: Uint8Array | null = null;
        try {
            if (await this.writePacket(Command.CMD_SET_CONFIG, Config.encode(config).finish())) {
                response = await this.readPacket();
            }
        } finally {
            await this.closeSerialPort();
        }

        if (response == null || response.length <= 0) {
            return null;
        } else if (response[0] === Command.CMD_ERROR) {
            console.log(`Error: ${response.slice(1)}`);
        }
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

        let decoded: Uint8Array | null = null;
        const decode = createBlockDecoder((decodedData) => {
            decoded = decodedData;
        });
        decode(rawData);

        return decoded;
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

            const encodeAndWrite = createBlockEncoder(async (encodedData) => {
                await writer.write(encodedData);
            });
            encodeAndWrite(rawData);
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
}

export default HayBoxDevice;
