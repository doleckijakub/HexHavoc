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
    '/textures/:texture': async (req) => {
      const { texture } = req.params;
      const textureFile = Bun.file(`./src/textures/${texture}`);
      return new Response(await textureFile.arrayBuffer(), {
        headers: { 'Content-Type': textureFile.type }
      });
    },
  }
})
