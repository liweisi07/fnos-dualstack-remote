// nas-router：飞牛 NAS 单域名双栈智能分流
// 入口域名（如 fnos.example.com）只做跳转：
//   访问者有 IPv6 -> 302 到 https://<子域名>.v6.<域名>:16666
//   访问者纯 IPv4 -> 302 到 https://<子域名>.stun.<域名>:<STUN_PORT>
// 跳转后流量直连家里宽带，不经过 Cloudflare 中转。
// 域名改走环境变量 BASE_DOMAIN（Worker 后台 设置 → 变量和机密 里加文本变量），
// 不填时自动从访问的域名去掉第一段得到，例如 fnos.example.com -> example.com。

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const clientIP = request.headers.get("CF-Connecting-IP") || "";

    // 提取子域名前缀，例如访问 fnos.example.com 时，sub 为 "fnos"
    const hostParts = url.hostname.split(".");
    const sub = hostParts[0];

    // 域名：优先用环境变量 BASE_DOMAIN，不填则自动从访问域名去掉第一段
    const baseDomain = (env.BASE_DOMAIN || "").trim() || hostParts.slice(1).join(".");

    // 判断来访者是否具备 IPv6（IPv6 地址中必然包含冒号 ":"）
    const isIPv6 = clientIP.includes(":");

    // 从环境变量中读取 STUN 动态端口（默认兜底 26666）
    const stunPort = env.STUN_PORT || "26666";
    const ipv6Port = "16666";

    let targetUrl = "";
    if (isIPv6) {
      // 具备 IPv6：跳转至固定端口 IPv6 满速直连终点
      targetUrl = `https://${sub}.v6.${baseDomain}:${ipv6Port}${url.pathname}${url.search}`;
    } else {
      // 纯 IPv4 环境：跳转至 STUN 动态端口穿透终点
      targetUrl = `https://${sub}.stun.${baseDomain}:${stunPort}${url.pathname}${url.search}`;
    }

    // 返回 302 临时重定向，确保切换网络或端口变更后立即生效
    return Response.redirect(targetUrl, 302);
  },
};
