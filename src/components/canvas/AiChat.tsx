'use client'

import { Button } from '../ui/button'
import { MessageCircle } from 'lucide-react';
import { Sheet, SheetTrigger, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '../ui/sheet';
import { SendIcon } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { useEffect, useState } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import { generateWhiteboardStuff } from '@/actions/genAi/actions';
import { Spinner } from '../ui/spinner';
import { useCurrentShapeStore } from '@/store/toolStore';

interface message {
    sent: string 
    message: string
}

export default function AiChat() {

    const { setShape } = useCurrentShapeStore(); 
    const [messages, setMessages] = useState<message[]>([])
    const [currentUserMessage, setCurrentUserMessage] = useState('')
    const [loading, setLoading] = useState<boolean>(false); 

    const handleSend = async () => {
        try {
            setLoading(true)
            messages.push({sent: 'user', message: currentUserMessage})
            const message = await generateWhiteboardStuff('Generate a rectangle with stroke color black');
            const clean = message!.replace(/```json|```/g, '').trim();
            if (clean) {
                const json: {tool: string, props: any}[] = JSON.parse(clean)
                console.log(clean)
                setShape(json[0].tool, json[0].props); 
                messages.push({sent: 'ai', message: 'Your shape has been succesfully generated'})
            }
        } catch (err: any) {
            console.log(err)
            alert('Error caught while generating message'); 
        } finally {
            setLoading(false)
        }
       
    }

    return (
        <div className='absolute bottom-0 right-0 m-3'>
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant='outline'><MessageCircle /></Button>
                </SheetTrigger>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>
                            Chat with AI
                        </SheetTitle>
                        <SheetDescription>
                            Create whatever design you want.
                        </SheetDescription>
                    </SheetHeader>
                    <div className='flex flex-col  flex-1'>
                        <ScrollArea className='chats w-full h-[70vh]'>
                            {
                                messages.map((item, idx) => {
                                    return  <div 
                                    key={idx} 
                                    className={`flex w-full ${item.sent === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`border rounded-lg max-w-52 p-2 m-2 ${
                                        item.sent === 'user' 
                                            ? 'bg-blue-500 text-white' 
                                            : 'bg-gray-200 text-black'
                                    }`}>
                                        {item.message}
                                    </div>
                                </div>
                                })
                            }
                        </ScrollArea>
                        <div className='input h-42 gap-4 flex flex-col justify-center items-center'>
                            <div className='flex flex-col w-full mb-1 gap-2 ml-4'>
                                <Label htmlFor='aimessage'>Write your message here</Label>
                                <Textarea value={currentUserMessage} onChange={(e) => {setCurrentUserMessage(e.target.value)}} id='aimessage' draggable={false} style={{resize: 'none'}} className='w-10/11 h-20' inputMode='text' placeholder='Write to make magic happen...'/>
                            </div>
                            <Button onClick={handleSend} disabled={loading} className='w-4/5 cursor-pointer' size='default'>{loading && <Spinner />} Send a message <SendIcon /></Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}