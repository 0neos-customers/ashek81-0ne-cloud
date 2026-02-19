'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
  Input,
} from '@0ne/ui'
import { Loader2, ExternalLink, Copy, Check, Pencil } from 'lucide-react'
import { useContactUpdate, useSyntheticCreate } from '../hooks/use-contact-mutations'
import type { ContactActivity } from '../hooks/use-contact-activity'

interface ContactEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: ContactActivity | null
  onSuccess?: () => void
}

function ContactTypeBadge({ type }: { type: string | null }) {
  if (type === 'community_member') {
    return <Badge className="bg-green-100 text-green-800 border-green-200">Member</Badge>
  }
  if (type === 'dm_contact') {
    return <Badge className="bg-blue-100 text-blue-800 border-blue-200">DM</Badge>
  }
  return <Badge className="bg-gray-100 text-gray-600">Unknown</Badge>
}

/**
 * Editable field: value + pencil icon → click to edit.
 * Empty → always shows open input.
 */
function EditableField({
  label,
  value,
  placeholder,
  onChange,
  type = 'text',
  suffix,
}: {
  label: string
  value: string
  placeholder: string
  onChange: (val: string) => void
  type?: string
  suffix?: React.ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const hasValue = !!value.trim()

  if (!hasValue || editing) {
    return (
      <div className="grid gap-1">
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
        <div className="flex items-center gap-2">
          <Input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => { if (hasValue) setEditing(false) }}
            autoFocus={editing}
            className="flex-1"
          />
          {suffix}
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-1">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <span className="text-sm">{value}</span>
        <button
          onClick={() => setEditing(true)}
          className="text-muted-foreground hover:text-foreground"
          title={`Edit ${label.toLowerCase()}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {suffix}
      </div>
    </div>
  )
}

export function ContactEditDialog({
  open,
  onOpenChange,
  contact,
  onSuccess,
}: ContactEditDialogProps) {
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [ghlContactId, setGhlContactId] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { updateContact, isLoading: isUpdating } = useContactUpdate()
  const { createSynthetic, isLoading: isCreating } = useSyntheticCreate()

  const isMatched = !!contact?.ghl_contact_id
  const isSaving = isUpdating || isCreating

  // Reset form when dialog opens
  useEffect(() => {
    if (open && contact) {
      setDisplayName(contact.skool_display_name || '')
      setUsername(contact.skool_username || '')
      setEmail(contact.email || '')
      setPhone(contact.phone || '')
      setGhlContactId(contact.ghl_contact_id || '')
      setCopied(false)
      setError(null)
    }
  }, [open, contact])

  if (!contact) return null

  const getChangedFields = (): Record<string, string> => {
    const changes: Record<string, string> = {}
    if (displayName.trim() !== (contact.skool_display_name || ''))
      changes.display_name = displayName.trim()
    if (username.trim() !== (contact.skool_username || ''))
      changes.username = username.trim()
    if (email.trim() !== (contact.email || ''))
      changes.email = email.trim()
    if (phone.trim() !== (contact.phone || ''))
      changes.phone = phone.trim()
    if (ghlContactId.trim() !== (contact.ghl_contact_id || ''))
      changes.ghl_contact_id = ghlContactId.trim()
    return changes
  }

  const hasChanges = Object.keys(getChangedFields()).length > 0

  const handleSave = async () => {
    const changes = getChangedFields()
    if (Object.keys(changes).length === 0) return
    setError(null)

    const success = await updateContact(contact.skool_user_id, changes)
    if (success) {
      onSuccess?.()
      onOpenChange(false)
    } else {
      setError('Failed to save changes')
    }
  }

  const handleSyntheticCreate = async () => {
    setError(null)
    const result = await createSynthetic(contact.skool_user_id)
    if (result) {
      onSuccess?.()
      onOpenChange(false)
    } else {
      setError('Failed to create synthetic contact')
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>
            View and edit contact details. Click the pencil icon to edit a field.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name */}
          <div>
            <EditableField
              label="Name"
              value={displayName}
              placeholder="Display name..."
              onChange={(val) => { setDisplayName(val); setError(null) }}
            />
            <div className="mt-1">
              <ContactTypeBadge type={contact.contact_type} />
            </div>
          </div>

          {/* Username */}
          <EditableField
            label="Username"
            value={username}
            placeholder="Skool username..."
            onChange={(val) => { setUsername(val); setError(null) }}
          />

          {/* Skool User ID (read-only) */}
          <div className="grid gap-1">
            <label className="text-sm font-medium text-muted-foreground">Skool User ID</label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-xs">{contact.skool_user_id}</span>
              <button
                onClick={() => handleCopy(contact.skool_user_id)}
                className="text-muted-foreground hover:text-foreground"
                title="Copy"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Email */}
          <EditableField
            label="Email"
            value={email}
            placeholder="Email address..."
            onChange={(val) => { setEmail(val); setError(null) }}
            type="email"
          />

          {/* Phone */}
          <EditableField
            label="Phone"
            value={phone}
            placeholder="Phone number..."
            onChange={(val) => { setPhone(val); setError(null) }}
            type="tel"
          />

          {/* Survey Answers */}
          {contact.survey_answers && contact.survey_answers.length > 0 && (
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Survey Answers</label>
              <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                {contact.survey_answers.map((qa, i) => (
                  <div key={i}>
                    <p className="text-xs font-medium text-muted-foreground">{qa.question}</p>
                    <p className="text-sm">{qa.answer || '\u2014'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GHL Contact ID */}
          <EditableField
            label="GHL Contact ID"
            value={ghlContactId}
            placeholder="Paste GHL contact ID here..."
            onChange={(val) => { setGhlContactId(val); setError(null) }}
            suffix={
              isMatched && contact.ghl_location_id && contact.ghl_contact_id ? (
                <a
                  href={`https://app.gohighlevel.com/v2/location/${contact.ghl_location_id}/contacts/detail/${contact.ghl_contact_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-9 w-9 rounded-md border text-primary hover:text-primary/80 hover:bg-muted shrink-0"
                  title="Open in GHL"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : undefined
            }
          />

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>

          {!isMatched && (
            <Button
              variant="secondary"
              onClick={handleSyntheticCreate}
              disabled={isSaving}
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Synthetic
            </Button>
          )}

          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
