// crypto-utils.js - 加密工具模块

// SHA256哈希函数
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// HMAC-SHA256
async function hmacSha256(key, message) {
    const encoder = new TextEncoder();
    const keyData = typeof key === 'string' ? encoder.encode(key) : key;

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        encoder.encode(message)
    );

    return new Uint8Array(signature);
}

// 生成腾讯云API签名
async function generateTencentSignature(secretId, secretKey, payload, timestamp) {
    const TENCENT_API_ENDPOINT = 'tmt.tencentcloudapi.com';
    const service = 'tmt';
    const host = TENCENT_API_ENDPOINT;
    const algorithm = 'TC3-HMAC-SHA256';
    const date = new Date(timestamp * 1000).toISOString().substring(0, 10);

    // 1. 构建规范请求串
    const httpRequestMethod = 'POST';
    const canonicalUri = '/';
    const canonicalQueryString = '';
    const canonicalHeaders = `content-type:application/json\nhost:${host}\n`;
    const signedHeaders = 'content-type;host';
    const hashedRequestPayload = await sha256(payload);
    const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;

    // 2. 构建待签名字符串
    const credentialScope = `${date}/${service}/tc3_request`;
    const hashedCanonicalRequest = await sha256(canonicalRequest);
    const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

    // 3. 计算签名
    const secretDate = await hmacSha256(`TC3${secretKey}`, date);
    const secretService = await hmacSha256(secretDate, service);
    const secretSigning = await hmacSha256(secretService, 'tc3_request');
    const signature = await hmacSha256(secretSigning, stringToSign);
    const signatureHex = Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('');

    // 4. 构建Authorization
    const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`;

    return authorization;
}

// 生成阿里云API签名
async function generateAliSignature(accessKeySecret, method, path, queries) {
    const encoder = new TextEncoder();

    // 构造规范查询字符串
    const sortedQueries = Object.keys(queries).sort();
    const canonicalQueryString = sortedQueries.map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queries[key])}`).join('&');

    // 构造待签名字符串
    const stringToSign = `${method}&${encodeURIComponent('/')}&${encodeURIComponent(canonicalQueryString)}`;

    // 计算签名
    const key = `${accessKeySecret}&`;
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(key),
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        encoder.encode(stringToSign)
    );

    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// 导出函数
window.CryptoUtils = {
    sha256,
    hmacSha256,
    generateTencentSignature,
    generateAliSignature
};
