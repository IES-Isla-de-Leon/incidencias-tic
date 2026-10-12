<script setup>
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import LoginView from './views/LoginView.vue'
import { useAuth } from './composables/useAuth.js'

const router = useRouter()
const auth = useAuth()

onMounted(auth.initialize)

watch(
  () => [auth.state.ready, auth.isAuthenticated.value, auth.isAdmin.value],
  ([ready, authenticated, admin]) => {
    if (!ready || !authenticated) return
    if (admin && router.currentRoute.value.path === '/') router.replace('/admin')
    if (!admin && router.currentRoute.value.meta.admin) router.replace('/')
  }
)
</script>

<template>
  <div class="min-h-screen">
    <AppHeader />

    <main v-if="!auth.state.ready" class="page-container grid min-h-[60vh] place-items-center py-12">
      <div class="text-center" role="status">
        <div class="mx-auto size-10 animate-spin rounded-full border-4 border-isla-100 border-t-isla-700"></div>
        <p class="mt-4 text-slate-600">Comprobando la sesión…</p>
      </div>
    </main>

    <LoginView v-else-if="!auth.isAuthenticated.value" />
    <RouterView v-else />
  </div>
</template>

