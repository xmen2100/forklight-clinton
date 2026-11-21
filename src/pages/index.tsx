import { useEffect } from 'react'
export default function Index() {
  useEffect(() => { window.location.replace('/decisions') }, [])
  return <main><p>Opening your notebook… <a href="/decisions">Continue to Forklight</a></p></main>
}
