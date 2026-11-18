// nas-router：飞牛 NAS 单域名双栈智能分流
// 入口域名（如 fnos.example.com）只做跳转：
//   访问者有 IPv6 -> 302 到 https://<子域名>.v6.example.com:16666
//   访问者纯 IPv4 -> 302 到 https://<子域名>.stun.example.com:<STUN_PORT>
// 跳转后流量直连家里宽带，不经过 Cloudflare 中转。

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const clientIP = request.headers.get("CF-Connecting-IP") || "";

    // 提取子域名前缀，例如访问 fnos.example.com 时，sub 为 "fnos"
    const hostParts = url.hostname.split(".");
    const sub = hostParts[0];

    // 判断来访者是否具备 IPv6（IPv6 地址中必然包含冒号 ":"）
    const isIPv6 = clientIP.includes(":");

    // 从环境变量中读取 STUN 动态端口（默认兜底 26666）
    const stunPort = env.STUN_PORT || "26666";
    const ipv6Port = "16666";

    let targetUrl = "";
    if (isIPv6) {
      // 具备 IPv6：跳转至固定端口 IPv6 满速直连终点
      targetUrl = `https://${sub}.v6.example.com:${ipv6Port}${url.pathname}${url.search}`;
    } else {
      // 纯 IPv4 环境：跳转至 STUN 动态端口穿透终点
      targetUrl = `https://${sub}.stun.example.com:${stunPort}${url.pathname}${url.search}`;
    }

    // 返回 302 临时重定向，确保切换网络或端口变更后立即生效
    return Response.redirect(targetUrl, 302);
  },
};
