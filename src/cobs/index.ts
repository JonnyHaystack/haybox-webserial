/**
 * Adapted from https://www.npmjs.com/package/cobs - MIT license
 */

import { Buffer } from "buffer";

function encode(buf: Buffer, zeroFrame: boolean = true) {
    var dest = [0];
    var code_ptr = 0;
    var code = 0x01;

    if (zeroFrame) {
        dest.push(0x00);
        code_ptr++;
    }

    function finish(incllast: boolean = true) {
        dest[code_ptr] = code;
        code_ptr = dest.length;
        incllast !== false && dest.push(0x00);
        code = 0x01;
    }

    for (var i = 0; i < buf.length; i++) {
        if (buf[i] == 0) {
            finish();
        } else {
            dest.push(buf[i]);
            code += 1;
            if (code == 0xff) {
                finish();
            }
        }
    }
    finish(false);

    if (zeroFrame) {
        dest.push(0x00);
    }

    return Buffer.from(dest);
}

function decode(buf: Buffer) {
    var dest = [];
    for (var i = 0; i < buf.length; ) {
        var code = buf[i++];
        for (var j = 1; j < code; j++) {
            dest.push(buf[i++]);
        }
        if (code < 0xff && i < buf.length) {
            dest.push(0);
        }
    }
    return Buffer.from(dest);
}

export { encode, decode };
