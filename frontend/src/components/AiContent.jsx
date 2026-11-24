import { useState } from 'react'
import '../css/AiContent.css'

function AiContent() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [threadId] = useState(() => {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID()
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  })


  
  async function handleAsk(value = message) {
    const inputValue = value.trim()
    if (!inputValue || isLoading) return

    setMessages((currentMessages) => [
      ...currentMessages,
      { role: 'user', text: inputValue },
    ])
    setMessage('')
    setError('')
    setIsLoading(true)

    try {
      const data = await sendMessageToBackend(inputValue)
      if (typeof data.message !== 'string' || !data.message.trim()) {
        throw new Error('The backend returned an empty response.')
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        { role: 'assistant', text: data.message },
      ])
    } catch (requestError) {
      setError(requestError.message || 'Unable to reach the backend.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleAsk(event.currentTarget.value)
    }
  }
   // You can add more logic here to send 
   // the message to the backend and get a response if needed.

  async function sendMessageToBackend(message) {
    const response = await fetch('http://localhost:3000/chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, threadId }),
      })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status}).`)
    }
    return data
  }

  return (

    <div className="container mx-auto max-w-3xl pb-44 px-2">
      

      {messages.map(({ role, text }, index) => (
        <div
          className={`my-6 bg-neutral-800 p-3 rounded-xl max-w-fit ${
            role === 'user' ? 'ml-auto' : 'mr-auto'
          }`}
          key={`${index}-${role}`}
        >
          {text}
        </div>
      ))}

      {isLoading && (
        <div className="my-6 bg-neutral-800 p-3 rounded-xl mr-auto max-w-fit">
          Thinking...
        </div>
      )}
      {error && <p className="my-4 text-red-400" role="alert">{error}</p>}
      
      <div className="fixed inset-x-0 bottom-0 flex items-center justify-center ">
       <div className="bg-neutral-800 p-2 rounded-3xl w-full max-w-3xl mb-4">
        <textarea
          className="w-full resize-none outline-0 p-3"
          rows="2"
          placeholder="Type your message..."
          id="input"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="flex items-center justify-end">
          <button
            type="button"
            className="bg-white px-4 py-1 text-black rounded-full cursor-pointer hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => handleAsk()}
            disabled={isLoading || !message.trim()}
          >
            {isLoading ? 'Sending...' : 'Ask'}
          </button>
        </div>
       </div>
      </div>
    </div>
  )
}

export default AiContent
