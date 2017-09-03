import axios from 'axios'

import * as types from '~/vuex/types'


export const state = {
  list: [],
  selected: {},
  loading: false,

  device: {
    selected: {},
    detail: {},
    loading: false,
    error: '',

    apps: {
      list: [],
      loading: false,
      error: ''
    }
  }
}

export const getters = {
  [types.GET_DEVICES]: state => state.list,
  [types.GET_DEVICE]: state => state.selected,
  [types.DEVICES_LOADING]: state => state.loading,
  [types.GET_APPS]: state => state.device.apps.list,
  [types.APPS_LOADING]: state => state.device.apps.loading,
  [types.GET_DEVICE_DETAIL]: state => state.device.detail,
  [types.DEVICE_DETAIL_LOADING]: state => state.device.loading,
  [types.APPS_ERROR]: state => state.device.apps.error,
}


export const mutations = {
  [types.ADD_DEVICE]: (state, device) => state.list.push(device),
  [types.REMOVE_DEVICE]: (state, device) => {
    if (device.id == state.selected.id) {
      state.selected = {}
    }
  },
  [types.UPDATE_DEVICES]: (state, list) => {
    state.list = list
  },
  [types.SELECT_DEVICE]: (state, id) => {
    let dev = state.list.find(dev => dev.id == id)
    if (dev) {
      state.selected = dev
      state.error = ''
    } else {
      state.selected = {}
      state.error = 'device not found'
    }
    return Boolean(dev)
  },
  [types.DEVICE_DETAIL]: (state, info) => {
    state.device.detail = info
  },
  [types.DEVICE_ERROR]: (state, err) => {
    state.device.error = err
  },
  [types.LOADING_APPS]: (state, loading) => {
    let { apps } = state.device
    apps.loading = loading
    if (loading)
      apps.list = []
  },
  [types.UPDATE_APPS]: (state, list) => {
    state.device.apps.list = list
  },
  [types.APPS_ERROR]: (state, err) => {
    state.device.apps.error = error
  }
}

export const actions = {
  [types.LOAD_DEVICES]({ commit, state }) {
    if (state.list.length)
      return

    axios.get('/devices')
      .then(({ data }) => commit(types.UPDATE_DEVICES, data))
  },
  [types.LOAD_DEVICE_DETAIL]({ commit, state }) {
    if (!state.selected.id)
      return

    axios.get(`/device/${state.selected.id}/info`)
      .then(({ data }) => commit(types.DEVICE_DETAIL, data))
  },
  [types.LOAD_APPS]({ commit, state }) {
    if (!state.selected.id)
      return

    commit(types.LOADING_APPS, true)
    axios.get(`/device/${state.selected.id}/apps/`)
      .then(({ data }) => commit(types.UPDATE_APPS, data))
      .catch(err => commit(types.APPS_ERROR, err))
      .finally(() => commit(types.LOADING_APPS, false))
  }
}
