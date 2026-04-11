import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Agenda de Shows"

interface AgendaInvitationProps {
  companyName?: string
  inviterName?: string
  role?: string
  acceptUrl?: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  collaborator: 'Colaborador',
  viewer: 'Visualizador',
}

const AgendaInvitationEmail = ({ companyName, inviterName, role, acceptUrl }: AgendaInvitationProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Você foi convidado para a agenda de {companyName || 'uma empresa'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={logoText}>🎵 {SITE_NAME}</Text>
        </Section>

        <Heading style={h1}>Convite para Agenda Compartilhada</Heading>

        <Text style={text}>
          {inviterName ? `${inviterName} convidou` : 'Você foi convidado(a) para'} você para acessar a agenda de{' '}
          <strong>{companyName || 'uma empresa'}</strong> como{' '}
          <strong>{ROLE_LABELS[role || 'viewer'] || role}</strong>.
        </Text>

        <Text style={text}>
          Com a Agenda Compartilhada, você pode visualizar e gerenciar shows da equipe sem precisar de uma assinatura própria.
        </Text>

        {acceptUrl && (
          <Section style={buttonSection}>
            <Button style={button} href={acceptUrl}>
              Aceitar convite
            </Button>
          </Section>
        )}

        <Hr style={hr} />

        <Text style={footerText}>
          Se você não esperava este convite, pode ignorar este e-mail com segurança.
        </Text>

        <Text style={footerText}>
          — Equipe {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AgendaInvitationEmail,
  subject: (data: Record<string, any>) =>
    `Convite: acesse a agenda de ${data.companyName || 'uma empresa'}`,
  displayName: 'Convite de Agenda Compartilhada',
  previewData: {
    companyName: 'Banda Example',
    inviterName: 'João Silva',
    role: 'collaborator',
    acceptUrl: 'https://agendadeshows.lovable.app',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Arial', 'Helvetica', sans-serif" }
const container = { padding: '0', maxWidth: '560px', margin: '0 auto' }
const headerSection = {
  backgroundColor: 'hsl(258, 70%, 58%)',
  padding: '24px 32px',
  borderRadius: '12px 12px 0 0',
}
const logoText = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: 'bold' as const,
  margin: '0',
}
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#1a1a2e',
  margin: '28px 32px 16px',
}
const text = {
  fontSize: '15px',
  color: '#444466',
  lineHeight: '1.6',
  margin: '0 32px 16px',
}
const buttonSection = { textAlign: 'center' as const, margin: '24px 32px' }
const button = {
  backgroundColor: 'hsl(258, 70%, 58%)',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '12px',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
}
const hr = { borderColor: '#e8e8f0', margin: '24px 32px' }
const footerText = {
  fontSize: '13px',
  color: '#888899',
  lineHeight: '1.5',
  margin: '0 32px 8px',
}
