import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Calendar, Hotel, FileText, AlertCircle, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import type { ChatMessage } from '@/types';

export default function Chat() {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            sender: 'ai',
            message: 'Hello! Welcome to Grand Hotel. I\'m your AI assistant. How can I help you today?',
            timestamp: new Date().toISOString(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const getAIResponse = (userMessage: string): string => {
        const msg = userMessage.toLowerCase();

        if (msg.includes('book') || msg.includes('room') || msg.includes('reservation')) {
            return 'I can help you book a room! Click the "Check Availability" button below or visit our rooms page to see available options.';
        } else if (msg.includes('price') || msg.includes('cost') || msg.includes('rate')) {
            return 'Our room rates range from $99 for a Single room to $799 for our Presidential Suite. Click "Check Availability" to see all options and current pricing.';
        } else if (msg.includes('complain') || msg.includes('issue') || msg.includes('problem')) {
            return 'I\'m sorry to hear you\'re experiencing an issue. You can submit a formal complaint using the "File Complaint" button below, and our staff will address it promptly.';
        } else if (msg.includes('emergency') || msg.includes('urgent') || msg.includes('help')) {
            return 'If this is an emergency, please click the "Emergency" button below immediately. Our staff will respond right away.';
        } else if (msg.includes('feedback') || msg.includes('review') || msg.includes('rating')) {
            return 'We\'d love to hear your feedback! Click the "Give Feedback" button below to rate your experience.';
        } else if (msg.includes('cancel') || msg.includes('modify')) {
            return 'To modify or cancel a booking, please contact our front desk or use the "File Complaint" option to request changes.';
        } else if (msg.includes('amenities') || msg.includes('facilities')) {
            return 'Our hotel offers WiFi, AC, TV, Mini Bar, and some rooms include Balcony, Jacuzzi, Living Room, and more. Check the room details for specific amenities.';
        } else if (msg.includes('check in') || msg.includes('check out') || msg.includes('checkout') || msg.includes('checkin')) {
            return 'Standard check-in time is 3:00 PM and check-out is 11:00 AM. Special arrangements can be made upon request.';
        } else {
            return 'I\'m here to help! You can ask me about room bookings, prices, hotel amenities, or use the quick action buttons below for common services.';
        }
    };

    const handleSend = () => {
        if (!input.trim()) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            sender: 'user',
            message: input,
            timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        // Simulate AI typing delay
        setTimeout(() => {
            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                message: getAIResponse(input),
                timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, aiMessage]);
            setIsTyping(false);
        }, 1000);
    };

    const handleQuickAction = (action: string) => {
        switch (action) {
            case 'availability':
                navigate('/availability');
                break;
            case 'book':
                navigate('/booking');
                break;
            case 'complaint':
                navigate('/complaint');
                break;
            case 'emergency':
                navigate('/emergency');
                break;
            case 'feedback':
                navigate('/feedback');
                break;
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Card className="flex flex-col h-[calc(100vh-12rem)]">
                {/* Chat Header */}
                <div className="px-6 py-4 border-b bg-primary text-primary-foreground rounded-t-lg">
                    <h2 className="text-xl font-semibold">AI Assistant Chat</h2>
                    <p className="text-sm opacity-90">Always here to help you</p>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] rounded-lg px-4 py-2 ${msg.sender === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-gray-100 text-gray-900'
                                    }`}
                            >
                                <p>{msg.message}</p>
                                <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-gray-500'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center space-x-2">
                                <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                                <span className="text-gray-600">AI is typing...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                <div className="px-6 py-3 border-t bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-2">Quick Actions:</p>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAction('availability')}
                        >
                            <Calendar className="h-4 w-4 mr-1" />
                            Check Availability
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAction('book')}
                        >
                            <Hotel className="h-4 w-4 mr-1" />
                            Book Room
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAction('complaint')}
                        >
                            <FileText className="h-4 w-4 mr-1" />
                            File Complaint
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAction('emergency')}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Emergency
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAction('feedback')}
                        >
                            <Star className="h-4 w-4 mr-1" />
                            Give Feedback
                        </Button>
                    </div>
                </div>

                {/* Input Area */}
                <div className="px-6 py-4 border-t">
                    <div className="flex space-x-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type your message..."
                            className="flex-1"
                        />
                        <Button onClick={handleSend} disabled={!input.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
