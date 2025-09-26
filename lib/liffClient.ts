import liff from "@line/liff";

let liffInitialized = false;

export async function initLiff() {
    if (!liffInitialized) {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
        liffInitialized = true;
    }
}
