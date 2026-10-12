<script setup>
import { useAuth } from '../composables/useAuth.js'

const auth = useAuth()
</script>

<template>
  <header class="bg-[#0b2a44] text-white shadow-sm">
    <div class="page-container flex min-h-24 items-center justify-between gap-4 py-4">
      <RouterLink :to="auth.isAdmin.value ? '/admin' : '/'" class="min-w-0" aria-label="Inicio">
        <img
          src="https://iesisladeleon.es/wp-content/uploads/2025/08/Logo.png"
          alt="IES Isla de León"
          class="h-14 w-auto max-w-[250px] object-contain object-left sm:h-16 sm:max-w-[320px]"
        />
      </RouterLink>

      <div v-if="auth.isAuthenticated.value" class="flex shrink-0 items-center gap-3">
        <div class="hidden text-right sm:block">
          <p class="font-semibold leading-tight">{{ auth.state.profile.nombre }}</p>
          <p class="text-sm text-white/65">
            {{ auth.isAdmin.value ? 'Administrador' : 'Usuario' }}
          </p>
        </div>
        <button
          class="rounded-lg border border-white/25 px-3 py-2 text-sm font-semibold transition hover:bg-white/10"
          type="button"
          :disabled="auth.state.loading"
          @click="auth.signOut"
        >
          Salir
        </button>
      </div>
    </div>

    <nav v-if="auth.isAdmin.value" class="border-t border-white/10" aria-label="Administración">
      <div class="page-container flex gap-1 overflow-x-auto py-2">
        <RouterLink class="admin-nav" to="/admin">Panel</RouterLink>
        <RouterLink class="admin-nav" to="/admin/incidencias">Incidencias</RouterLink>
        <RouterLink class="admin-nav" to="/admin/estancias">Estancias</RouterLink>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.admin-nav {
  white-space: nowrap;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  color: rgb(255 255 255 / 75%);
  font-weight: 600;
  transition: background-color 150ms, color 150ms;
}

.admin-nav:hover {
  background: rgb(255 255 255 / 10%);
  color: white;
}

.admin-nav.router-link-exact-active {
  background: white;
  color: #0c2638;
}
</style>

