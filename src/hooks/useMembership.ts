import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface Invite {
  id: string
  household_id: string
  email: string
  role: 'member'
  token: string
  created_at: string
  expires_at: string
  used_at: string | null
}

export interface GuestLink {
  id: string
  household_id: string
  token: string
  label: string | null
  created_at: string
  expires_at: string
  revoked_at: string | null
}

// Einladungen (Member) und Gast-Links — nur für den Owner sichtbar/verwaltbar,
// durch RLS auf den Haushalt und die Rolle "owner" beschränkt.
export function useMembership(householdId: string | null, isOwner: boolean) {
  const [invites, setInvites] = useState<Invite[]>([])
  const [guestLinks, setGuestLinks] = useState<GuestLink[]>([])
  const [reloadCount, setReloadCount] = useState(0)

  const refresh = useCallback(() => setReloadCount((c) => c + 1), [])

  useEffect(() => {
    if (!householdId || !isOwner) {
      setInvites([])
      setGuestLinks([])
      return
    }
    let cancelled = false
    async function load() {
      const [invitesRes, linksRes] = await Promise.all([
        supabase
          .from('invites')
          .select('*')
          .eq('household_id', householdId)
          .order('created_at', { ascending: false }),
        supabase
          .from('guest_links')
          .select('*')
          .eq('household_id', householdId)
          .order('created_at', { ascending: false }),
      ])
      if (cancelled) return
      if (!invitesRes.error) setInvites(invitesRes.data as Invite[])
      if (!linksRes.error) setGuestLinks(linksRes.data as GuestLink[])
    }
    load()
    return () => {
      cancelled = true
    }
  }, [householdId, isOwner, reloadCount])

  async function createInvite(email: string) {
    if (!householdId) return
    const { error } = await supabase.from('invites').insert({ household_id: householdId, email })
    if (error) throw error
    refresh()
  }

  async function cancelInvite(id: string) {
    const { error } = await supabase.from('invites').delete().eq('id', id)
    if (error) throw error
    refresh()
  }

  async function createGuestLink(label: string) {
    if (!householdId) return
    const { error } = await supabase
      .from('guest_links')
      .insert({ household_id: householdId, label: label || null })
    if (error) throw error
    refresh()
  }

  async function revokeGuestLink(id: string) {
    const { error } = await supabase
      .from('guest_links')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    refresh()
  }

  return { invites, guestLinks, createInvite, cancelInvite, createGuestLink, revokeGuestLink }
}
