import vert from "./shaders/vert.wgsl";
import frag from "./shaders/frag.wgsl";

const main = async () => {
    const canvas = document.querySelector("#webgpu") as HTMLCanvasElement;
    if (!navigator.gpu) return;
    const context = canvas.getContext("webgpu") as GPUCanvasContext;
    const adaptor = await navigator.gpu?.requestAdapter() as GPUAdapter;
    if (!adaptor) return;
    const device = await adaptor.requestDevice() as GPUDevice;
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({device, format});
    const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
            module: device.createShaderModule({
                code:vert
            }),
            entryPoint: "vert"
        },
        fragment: {
            module: device.createShaderModule({
                code: frag,
            }),
            entryPoint: "frag",
            targets: [{format}]
        },
        primitive: {topology:"triangle-list"}
    });

    function paint() {
        const command_encoder = device.createCommandEncoder();
        const view = context.getCurrentTexture().createView();

        const render_pass_descriptor: GPURenderPassDescriptor = {
            colorAttachments: [
                {
                    view,
                    loadOp: "clear",
                    storeOp: "store",
                    clearValue: {r:0.0, g:0.0, b:0.0, a: 1.0}
                }
            ]
        };

        const render_pass = command_encoder.beginRenderPass(render_pass_descriptor);
        render_pass.setPipeline(pipeline);
        render_pass.draw(3, 1);
        render_pass.end();

        device.queue.submit([command_encoder.finish()]);
        
    };
    paint();
    
};

main();