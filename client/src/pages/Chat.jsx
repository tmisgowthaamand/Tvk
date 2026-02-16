import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost } from '../api'
import { Send, ArrowLeft } from 'lucide-react'
import './Chat.css'

const SAMPLE_IDS = ['WJB1079656', 'WJB2199364', 'WJB1247659', 'WJB2703338']

const QUICK_REPLIES = [
    { label: '👋 Start', text: 'Hi' },
    { label: '1️⃣ Verify', text: '1' },
    { label: '2️⃣ Member', text: '2' },
    { label: '3️⃣ Grievance', text: '3' },
    { label: '🏠 Menu', text: 'menu' }
]

export default function Chat() {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [phone, setPhone] = useState('919876543210')
    const [isTyping, setIsTyping] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const messagesRef = useRef(null)
    const inputRef = useRef(null)
    const navigate = useNavigate()

    useEffect(() => {
        // Initial welcome message
        setTimeout(() => {
            setMessages([{
                id: Date.now(),
                text: '🙏 *Welcome to TVK Voter Support System* 👋\n\nSend *Hi* to get started!',
                type: 'received',
                time: getTime()
            }])
        }, 500)
    }, [])

    useEffect(() => {
        if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight
        }
    }, [messages, isTyping])

    function getTime() {
        return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    }

    function formatBold(text) {
        return text.replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    }

    async function sendMessage(text) {
        const msg = (text || input).trim()
        if (!msg || isSending) return
        setInput('')
        setIsSending(true)

        // Add sent message
        const sentMsg = { id: Date.now(), text: msg, type: 'sent', time: getTime() }
        setMessages(prev => [...prev, sentMsg])

        // Show typing
        setIsTyping(true)

        try {
            const res = await apiPost('/chat', { phoneNumber: phone, message: msg })

            // Typing delay
            await new Promise(r => setTimeout(r, 600 + Math.random() * 800))

            setIsTyping(false)

            if (res.success) {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    text: res.reply,
                    type: 'received',
                    time: getTime()
                }])
            } else {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    text: '⚠️ Error: ' + (res.error || 'Something went wrong'),
                    type: 'received',
                    time: getTime()
                }])
            }
        } catch {
            setIsTyping(false)
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: '⚠️ Connection error. Is the backend server running on port 3000?',
                type: 'received',
                time: getTime()
            }])
        }

        setIsSending(false)
        inputRef.current?.focus()
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    return (
        <div className="chat-page">
            <div className="chat-container">
                {/* Header */}
                <div className="chat-header">
                    <button className="back-btn" onClick={() => navigate('/')}>
                        <ArrowLeft size={20} />
                    </button>
                    <div className="chat-avatar">TVK</div>
                    <div className="chat-info">
                        <h2>TVK Voter Support</h2>
                        <p>
                            <span className="online-dot" />
                            online
                        </p>
                    </div>
                </div>

                {/* Phone input */}
                <div className="phone-bar">
                    <span>📱 Simulating as:</span>
                    <input
                        type="text"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="phone-input"
                    />
                </div>

                {/* Sample IDs */}
                <div className="sample-ids">
                    <strong>Try IDs:</strong>
                    {SAMPLE_IDS.map(id => (
                        <button key={id} className="sample-id-btn" onClick={() => setInput(id)}>
                            {id}
                        </button>
                    ))}
                </div>

                {/* Messages */}
                <div className="messages-area" ref={messagesRef}>
                    <div className="date-separator"><span>Today</span></div>

                    {messages.map(msg => (
                        <div key={msg.id} className={`message ${msg.type}`}>
                            <div
                                className="msg-text"
                                dangerouslySetInnerHTML={{
                                    __html: formatBold(msg.text.replace(/\n/g, '<br>'))
                                }}
                            />
                            <div className="msg-time">
                                {msg.time} {msg.type === 'sent' && '✓✓'}
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="typing-indicator">
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                        </div>
                    )}
                </div>

                {/* Quick replies */}
                <div className="quick-replies">
                    {QUICK_REPLIES.map(qr => (
                        <button
                            key={qr.text}
                            className="quick-btn"
                            onClick={() => sendMessage(qr.text)}
                        >
                            {qr.label}
                        </button>
                    ))}
                </div>

                {/* Input */}
                <div className="chat-input-area">
                    <input
                        ref={inputRef}
                        type="text"
                        className="chat-input"
                        placeholder="Type a message..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoComplete="off"
                    />
                    <button className="send-btn" onClick={() => sendMessage()} disabled={isSending}>
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    )
}
