import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
  Section,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface AccessRequestEmailProps {
  user_email: string
  request_id: string
  app_url: string
}

export const AccessRequestEmail = ({
  user_email,
  request_id,
  app_url,
}: AccessRequestEmailProps) => (
  <Html>
    <Head />
    <Preview>New Inventory Access Request from {user_email}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🔐 New Access Request</Heading>
        <Text style={text}>
          A staff member has requested access to the Inventory Manager:
        </Text>
        <Section style={infoBox}>
          <Text style={infoText}>
            <strong>Email:</strong> {user_email}
          </Text>
          <Text style={infoText}>
            <strong>Request ID:</strong> {request_id.slice(0, 8)}...
          </Text>
        </Section>
        <Text style={text}>
          Click the button below to review and approve this request:
        </Text>
        <Button
          href={`${app_url}/access-approval`}
          style={button}
        >
          Review Access Request
        </Button>
        <Text style={footer}>
          If you didn't expect this request, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default AccessRequestEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 24px',
}

const infoBox = {
  backgroundColor: '#f4f4f4',
  borderRadius: '5px',
  padding: '16px 24px',
  margin: '16px 24px',
}

const infoText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '4px 0',
}

const button = {
  backgroundColor: '#5469d4',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '200px',
  padding: '12px',
  margin: '24px auto',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '24px 24px',
}
