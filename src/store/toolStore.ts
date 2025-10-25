import { create } from 'zustand'

interface currentAIShape {
    tool: string , 
    props: any, 
    setShape: (tool: string, props: any) => void
}

export const useToolStore = create<any>()((set) => ({
    selectedTool: "pencil",
    setSelectedTool: (tool: string) => set({ selectedTool: tool })
}))

export const useCurrentShapeStore = create<currentAIShape>()((set) => ({
    tool: '', 
    props: {}, 
    setShape: (tool, props) => set({ tool, props }) 
}))