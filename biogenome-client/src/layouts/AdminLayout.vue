<template>
   <VaLayout class="admin-layout-root" :top="{ fixed: true, order: 3 }">
      <template #top>
         <VaNavbar class="admin-nav" shadowed>
            <template #left>
               <!-- Wordmark -->
               <VaNavbarItem>
                  <span class="admin-nav__brand">Admin Area</span>
               </VaNavbarItem>

               <!-- Home -->
               <VaNavbarItem>
                  <router-link :to="{ name: 'home' }" class="cms-nav-btn">
                     <svg class="cms-nav-btn__icon" viewBox="0 0 16 16" fill="none"><path d="M1 7l7-6 7 6v7a1 1 0 01-1 1H2a1 1 0 01-1-1V7z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
                     Home
                  </router-link>
               </VaNavbarItem>

               <!-- Dashboard -->
               <VaNavbarItem>
                  <router-link :to="{ name: 'admin' }" class="cms-nav-btn" :class="{ 'cms-nav-btn--active': $route.name === 'admin' }">
                     <svg class="cms-nav-btn__icon" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.2" stroke="currentColor" stroke-width="1.4"/><rect x="9" y="1" width="6" height="6" rx="1.2" stroke="currentColor" stroke-width="1.4"/><rect x="1" y="9" width="6" height="6" rx="1.2" stroke="currentColor" stroke-width="1.4"/><rect x="9" y="9" width="6" height="6" rx="1.2" stroke="currentColor" stroke-width="1.4"/></svg>
                     Dashboard
                  </router-link>
               </VaNavbarItem>

            </template>

            <template #right>
               <!-- User info (click to edit profile — data managers only) -->
               <VaNavbarItem class="admin-nav__user">
                  <button
                     v-if="!isAdmin"
                     class="admin-nav__user-btn"
                     :title="`Edit profile for ${globalStore.userName}`"
                     @click="openProfileModal"
                  >
                     <span class="admin-nav__user-avatar" aria-hidden="true">
                        {{ globalStore.userName?.charAt(0)?.toUpperCase() ?? '?' }}
                     </span>
                     <span class="admin-nav__user-name">{{ globalStore.userName }}</span>
                  </button>
                  <span v-else class="admin-nav__user-static">
                     <span class="admin-nav__user-avatar" aria-hidden="true">
                        {{ globalStore.userName?.charAt(0)?.toUpperCase() ?? '?' }}
                     </span>
                     <span class="admin-nav__user-name">{{ globalStore.userName }}</span>
                  </span>
               </VaNavbarItem>

               <!-- Logout -->
               <VaNavbarItem>
                  <button class="cms-nav-btn cms-nav-btn--danger" @click="logoutUser">
                     <svg class="cms-nav-btn__icon" viewBox="0 0 16 16" fill="none"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                     Logout
                  </button>
               </VaNavbarItem>
            </template>
         </VaNavbar>

         <!-- Profile edit modal -->
         <VaModal
            v-model="profileModalVisible"
            title="Edit profile"
            hide-default-actions
            size="small"
         >
            <div class="cms-profile-form">
               <p class="cms-profile-form__lead">Update your email address or password. Leave a field blank to keep its current value.</p>
               <div class="cms-profile-form__fields">
                  <VaInput
                     v-model="profileForm.email"
                     label="Email address"
                     type="email"
                     placeholder="New email address"
                  />
                  <VaInput
                     v-model="profileForm.password"
                     label="New password"
                     type="password"
                     placeholder="Leave blank to keep current"
                  />
               </div>
            </div>
            <template #footer>
               <div class="cms-profile-form__footer">
                  <VaButton preset="secondary" @click="profileModalVisible = false">Cancel</VaButton>
                  <VaButton
                     :loading="profileSubmitting"
                     :disabled="!profileIsValid"
                     @click="handleProfileUpdate"
                  >
                     Save changes
                  </VaButton>
               </div>
            </template>
         </VaModal>
      </template>

      <template #content>
         <main class="admin-main">
            <div class="admin-content">
               <router-view />
            </div>
            <!-- VaDropdown teleports here so panels stay under .admin-layout-root (cms-styles.scss) -->
            <div id="cms-admin-dropdown-portal" class="cms-admin-dropdown-portal" aria-hidden="true" />
         </main>
      </template>
   </VaLayout>
</template>

<script setup lang="ts">
   import { computed, onMounted, reactive, ref } from 'vue'
   import { useRouter } from 'vue-router'
   import { useToast } from 'vuestic-ui'
   import { useGlobalStore } from '../stores/global-store'
   import { useStatsStore } from '../stores/stats-store'
   import AuthService from '../services/AuthService'
   const router = useRouter()
   const { init } = useToast()
   const globalStore = useGlobalStore()
   const statsStore = useStatsStore()

   const isAdmin = computed(() => globalStore.userRole === 'Admin')

   onMounted(async () => {
      if (isAdmin.value) {
         await statsStore.getPortalStats()
      } else {
         await statsStore.getUserStats(globalStore.userName)
      }
   })

   async function logoutUser() {
      await globalStore.logout()
      router.push({ name: 'home' })
   }

   /* ── profile modal ──────────────────────────────────────────────── */
   const profileModalVisible = ref(false)
   const profileForm = reactive({ email: '', password: '' })
   const profileSubmitting = ref(false)
   const profileIsValid = computed(() => !!profileForm.email || !!profileForm.password)

   function openProfileModal() {
      profileForm.email = globalStore.userEmail ?? ''
      profileForm.password = ''
      profileModalVisible.value = true
   }

   async function handleProfileUpdate() {
      profileSubmitting.value = true
      try {
         const payload: Record<string, string> = {}
         if (profileForm.email) payload.email = profileForm.email
         if (profileForm.password) payload.password = profileForm.password
         await AuthService.updateSelf(globalStore.userName, payload)
         if (payload.email) globalStore.userEmail = payload.email
         init({ message: 'Profile updated successfully.', color: 'success' })
         profileModalVisible.value = false
      } catch (err: any) {
         const msg = err?.response?.data ?? 'Something went wrong. Please try again.'
         init({ message: String(msg), color: 'danger' })
      } finally {
         profileSubmitting.value = false
      }
   }
</script>

<!-- Unscoped: shared CMS rules target descendants under .admin-layout-root; scoped would break child components. -->
<style lang="scss">
   @import '../scss/cms-styles.scss';
</style>
