import { computed, reactive } from 'vue'
import { ALLOWED_DOMAIN } from '../lib/constants.js'
import { friendlyError, isCorporateEmail, oauthRedirectUrl } from '../lib/formatters.js'
import { supabase } from '../services/supabase.js'

const state = reactive({
  ready: false,
  loading: false,
  session: null,
  profile: null,
  message: '',
  error: ''
})

let initialization
let subscribed = false

async function clearRejectedSession(message) {
  await supabase.auth.signOut()
  state.session = null
  state.profile = null
  state.message = message
}

async function hydrateSession(session) {
  state.loading = true
  state.error = ''

  try {
    if (!session) {
      state.session = null
      state.profile = null
      return
    }

    if (!isCorporateEmail(session.user?.email, ALLOWED_DOMAIN)) {
      await clearRejectedSession('El acceso está limitado a cuentas del dominio iesisladeleon.es.')
      return
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('id,email,nombre,rol,activo')
      .eq('id', session.user.id)
      .single()

    if (error) throw error

    if (!data.activo) {
      await clearRejectedSession('Tu acceso está deshabilitado. Contacta con el responsable TIC.')
      return
    }

    state.session = session
    state.profile = data
    state.message = ''
  } catch (error) {
    state.session = null
    state.profile = null
    state.error = friendlyError(error)
  } finally {
    state.loading = false
    state.ready = true
  }
}

async function initialize() {
  if (initialization) return initialization

  initialization = (async () => {
    if (!subscribed) {
      supabase.auth.onAuthStateChange((_event, session) => {
        window.setTimeout(() => hydrateSession(session), 0)
      })
      subscribed = true
    }

    const { data, error } = await supabase.auth.getSession()
    if (error) {
      state.error = friendlyError(error)
      state.ready = true
      return
    }
    await hydrateSession(data.session)
  })()

  return initialization
}

async function signIn() {
  state.loading = true
  state.error = ''
  state.message = ''

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: oauthRedirectUrl(),
      queryParams: {
        hd: ALLOWED_DOMAIN,
        prompt: 'select_account'
      }
    }
  })

  if (error) {
    state.error = friendlyError(error)
    state.loading = false
  }
}

async function signOut() {
  state.loading = true
  state.error = ''
  state.message = ''
  const { error } = await supabase.auth.signOut()
  if (error) state.error = friendlyError(error)
  state.session = null
  state.profile = null
  state.loading = false
}

export function useAuth() {
  return {
    state,
    isAuthenticated: computed(() => Boolean(state.session && state.profile)),
    isAdmin: computed(() => state.profile?.rol === 'ADMINISTRADOR'),
    initialize,
    signIn,
    signOut
  }
}

