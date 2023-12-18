import vert from "./shaders/vert.wgsl";
import frag from "./shaders/frag.wgsl";

type BinaryArrayTypes = Float32Array | Int32Array ; // | Int8Array | Float64Array | Int16Array
type InputJSGPUTypes = BinaryArrayTypes | number;
type SupportedAtomicTypes = "Float32" | "Integer32" | "UInteger32"
type SupportedGPUTypes = BinaryArrayTypes | SupportedAtomicTypes;

type ArrayShape = Array<number> & { length: 2 };

const make_gpu_buffer = (device: GPUDevice, label: string, usage: GPUBufferUsage, gpu_data_type: SupportedGPUTypes, data_shape?: ArrayShape, input_data?: InputJSGPUTypes) => {
    let size = 0;
    if (typeof gpu_data_type == "string"){
        // type is atomic
        if (gpu_data_type == "Float32") size = Float32Array.BYTES_PER_ELEMENT;
        else if (gpu_data_type == "Integer32") Int32Array.BYTES_PER_ELEMENT;
        else if (gpu_data_type == "UInteger32") Uint32Array.BYTES_PER_ELEMENT;
    }
    else {
        // type is an array type
        const gpu_data_type_array = gpu_data_type as BinaryArrayTypes;
        const rows = data_shape[0];
        const columns = data_shape[1];
        size = gpu_data_type_array.BYTES_PER_ELEMENT * rows * columns;
    }

    //device.createBuffer();
} 
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
            visibility: GPUShaderStage.VERTEX,
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