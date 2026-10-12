import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import UserHome from '../views/UserHome.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import AdminIncidents from '../views/AdminIncidents.vue'
import AdminRooms from '../views/AdminRooms.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: UserHome },
    { path: '/admin', name: 'admin-dashboard', component: AdminDashboard, meta: { admin: true } },
    { path: '/admin/incidencias', name: 'admin-incidents', component: AdminIncidents, meta: { admin: true } },
    { path: '/admin/estancias', name: 'admin-rooms', component: AdminRooms, meta: { admin: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach(async (to) => {
  const auth = useAuth()
  await auth.initialize()

  if (!auth.isAuthenticated.value) return to.path === '/' ? true : '/'
  if (to.meta.admin && !auth.isAdmin.value) return '/'
  if (to.path === '/' && auth.isAdmin.value) return '/admin'
  return true
})

export default router

