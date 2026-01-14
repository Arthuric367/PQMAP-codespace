import { createRouter, createWebHistory } from 'vue-router'
import Layout from '../views/Layout.vue'
import Dashboard from '../views/Dashboard.vue'
import Messages from '../views/Messages.vue'
import MessageDetail from '../views/MessageDetail.vue'
import Templates from '../views/Templates.vue'
import Systems from '../views/Systems.vue'
import Channels from '../views/Channels.vue'
import Recipients from '../views/Recipients.vue'
import MessageTypes from '../views/MessageTypes.vue'
import Settings from '../views/Settings.vue'
import ParamConfig from '../views/ParamConfig.vue'
import Login from '../views/Login.vue'
import NotFound from '../views/NotFound.vue'
import ScheduledMessages from '../views/ScheduledMessages.vue'
import MessageRecords from '../views/MessageRecords.vue'
import NotificationTriggerRules from '../views/NotificationTriggerRules.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: Login
    },
    {
      path: '/',
      component: Layout,
      children: [
        {
          path: '',
          name: 'dashboard',
          component: Dashboard,
          meta: { title: 'Dashboard', icon: 'Odometer' }
        },
        {
          path: 'messages',
          name: 'messages',
          component: Messages,
          meta: { title: 'Messages', icon: 'Message' }
        },
        {
          path: 'messages/:id',
          name: 'message-detail',
          component: MessageDetail,
          meta: { title: 'Message Details', hidden: true }
        },
        {
          path: 'scheduled-messages',
          name: 'scheduled-messages',
          component: ScheduledMessages,
          meta: { title: 'Scheduled Messages', icon: 'Timer' }
        },
        {
          path: 'message-records',
          name: 'message-records',
          component: MessageRecords,
          meta: { title: 'Message Records', icon: 'Tickets' }
        },
        {
          path: 'templates',
          name: 'templates',
          component: Templates,
          meta: { title: 'Templates', icon: 'Document' }
        },
        {
          path: 'trigger-rules',
          name: 'trigger-rules',
          component: NotificationTriggerRules,
          meta: { title: 'Trigger Rules', icon: 'Warning' }
        },
        {
          path: 'systems',
          name: 'systems',
          component: Systems,
          meta: { title: 'Systems', icon: 'Connection' }
        },
        {
          path: 'channels',
          name: 'channels',
          component: Channels,
          meta: { title: 'Channels', icon: 'Share' }
        },
        {
          path: 'param-config',
          name: 'param-config',
          component: ParamConfig,
          meta: { title: 'Param-config', icon: 'SetUp' }
        },
        {
          path: 'recipients',
          name: 'recipients',
          component: Recipients,
          meta: { title: 'Recipients', icon: 'User' }
        },
        {
          path: 'types',
          name: 'message-types',
          component: MessageTypes,
          meta: { title: 'Message Types', icon: 'Collection' }
        },
        {
          path: 'alerts',
          name: 'anomaly-alerts',
          component: () => import('../views/AnomalyAlerts.vue'),
          meta: { title: 'Alerts', icon: 'Warning' }
        },
        {
          path: 'statistics',
          name: 'statistics',
          component: () => import('../views/Statistics.vue'),
          meta: { title: 'Statistics', icon: 'DataAnalysis' }
        },
        {
          path: 'settings',
          name: 'settings',
          component: Settings,
          meta: { title: 'Settings', icon: 'Setting' }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFound
    }
  ]
})

export default router
