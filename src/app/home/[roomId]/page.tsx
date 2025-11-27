import AiChat from "@/components/canvas/AiChat";
import Canvas from "@/components/canvas/Canvas";
import { SimpleVoiceChat } from "@/components/canvas/SimpleVoiceChat";

export default async function({params}: {params: Promise<{ roomId: string }>}) {

    const {roomId} = await (params); 
    

    return (
        <div className="flex flex-row w-full h-screen gap-4">
            <Canvas roomId={roomId}/>
            <AiChat />
        </div>
    )
}