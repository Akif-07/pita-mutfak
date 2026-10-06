export default {
  async fetch(request, env) {
    // 1. Statik dosya isteğini karşıla
    try {
      const response = await env.ASSETS.fetch(request);
      if (response && response.status !== 404) {
        return response;
      }
    } catch (e) {}

    // 2. Sayfa bulunamadığında SPA yönlendirmesi için index.html döndür
    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
  }
};
