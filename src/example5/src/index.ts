import vert from "./shaders/vert.wgsl";
import frag from "./shaders/frag.wgsl";

let frame_idx = 0;

const main = async () => {
    const canvas = document.querySelector("#webgpu") as HTMLCanvasElement;
    if (!navigator.gpu) return;
    const context = canvas.getContext("webgpu") as GPUCanvasContext;
    const adaptor = await navigator.gpu?.requestAdapter() as GPUAdapter;
    if (!adaptor) return;
    const device = await adaptor.requestDevice() as GPUDevice;
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({device, format});

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
    const pipeline_layout = device.createPipelineLayout({
        bindGroupLayouts: [bind_group_layout]
    });

    const pipeline = device.createRenderPipeline({
        layout: pipeline_layout,
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

        device.queue.writeBuffer(uniform_time, 0, new Float32Array([frame_idx]));
        const render_pass = command_encoder.beginRenderPass(render_pass_descriptor);
        render_pass.setPipeline(pipeline);
        render_pass.setBindGroup(0, group_uniform_time);
        render_pass.draw(6, 1);
        render_pass.end();

        device.queue.submit([command_encoder.finish()]);
        frame_idx++;
        requestAnimationFrame(paint);        
    };
    requestAnimationFrame(paint);
    
};

main();