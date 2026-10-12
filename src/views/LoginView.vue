<script setup>
import { useAuth } from '../composables/useAuth.js'

const auth = useAuth()
</script>

<template>
  <main class="page-container py-12 sm:py-16">
    <section class="card mx-auto max-w-xl p-7 sm:p-9" aria-labelledby="login-title">
      <p class="eyebrow mb-2">Incidencias TIC</p>
      <h1 id="login-title" class="text-3xl font-bold tracking-tight">Acceso al servicio</h1>
      <p class="mt-3 text-lg leading-relaxed text-slate-600">
        Inicia sesión con tu cuenta corporativa del IES Isla de León.
      </p>

      <div v-if="auth.state.message" class="notice-error mt-6" role="alert">
        {{ auth.state.message }}
      </div>
      <div v-if="auth.state.error" class="notice-error mt-6" role="alert">
        {{ auth.state.error }}
      </div>

      <button
        class="btn-primary mt-7 w-full"
        type="button"
        :disabled="auth.state.loading"
        @click="auth.signIn"
      >
        {{ auth.state.loading ? 'Redirigiendo…' : 'Iniciar sesión con Google' }}
      </button>
      <p class="mt-3 text-center text-sm text-slate-500">
        Acceso restringido al dominio iesisladeleon.es
      </p>
    </section>
  </main>
</template>

