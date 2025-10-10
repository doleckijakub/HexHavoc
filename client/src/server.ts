import html from '../index.html';

Bun.serve({
  port: 3000,
  routes: {
    '/': html,
    '/shaders/:shader': async (req) => {
      const { shader } = req.params;
      const shaderFile = Bun.file(`./src/shaders/${shader}`);
      return new Response(await shaderFile.text(), {
        headers: { 'Content-Type': 'text/plain' }
      });
    },
  }
})
