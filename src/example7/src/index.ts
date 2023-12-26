import shaders from "./shaders/shaders.wgsl";

let frame_idx = 0;

/*

So what do we want for this pipeline?

we want a binding to define 3d points
we need a 4d camera matrix
we need the export texture...

 */

const main = async () => {
    const canvas = document.querySelector("#webgpu") as HTMLCanvasElement;
    if (!navigator.gpu) return;
    const context = canvas.getContext("webgpu") as GPUCanvasContext;
    const adaptor = await navigator.gpu?.requestAdapter() as GPUAdapter;
    if (!adaptor) return;
    const format = adaptor.features.has('bgra8unorm-storage')
      ? navigator.gpu.getPreferredCanvasFormat()
      : 'rgba8unorm';

    const device = await adaptor.requestDevice({
        requiredFeatures: format === 'bgra8unorm'
        ? ['bgra8unorm-storage']
        : [],
    }) as GPUDevice;   

    console.log("format", format);

    context.configure({device, format,  usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING});

    const uniform_time = device.createBuffer({size: Float32Array.BYTES_PER_ELEMENT, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST})
    const bind_group_layout = device.createBindGroupLayout({
        entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: {
                type: "uniform"
            }
        }
        ]
    });
    const group_uniform_time = device.createBindGroup({
        layout: bind_group_layout,
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: uniform_time,
                    offset: 0,
                    size: 4
                }
            }
        ]
    });
    const render_pipeline_layout = device.createPipelineLayout({
        bindGroupLayouts: [bind_group_layout]
    });

    const render_pipeline = device.createRenderPipeline({
        layout: render_pipeline_layout,
        vertex: {
            module: device.createShaderModule({
                code:shaders
            }),
            entryPoint: "vert"
        },
        fragment: {
            module: device.createShaderModule({
                code: shaders,
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

        device.queue.writeBuffer(uniform_time, 0, new Float32Array([frame_idx]));
        const render_pass = command_encoder.beginRenderPass(render_pass_descriptor);
        render_pass.setPipeline(render_pipeline);
        render_pass.setBindGroup(0, group_uniform_time);
        render_pass.draw(6, 1);
        render_pass.end();

        device.queue.submit([command_encoder.finish()]);
        //frame_idx++;
        requestAnimationFrame(paint);        
    };
    setInterval(()=>frame_idx++,25);
    requestAnimationFrame(paint);
    
};

main();