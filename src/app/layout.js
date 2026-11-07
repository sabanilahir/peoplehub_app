import './globals.css'
import DynamicFavicon from '@/components/layout/DynamicFavicon'

export const metadata = {
  title: 'San PeopleHub',
  icons: {
    icon: '/logos/san-logo.png',
    shortcut: '/logos/san-logo.png',
    apple: '/logos/san-logo.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/logos/san-logo.png" />
      </head>
      <body>
        <DynamicFavicon />
        {children}
      </body>
    </html>
  )
}
