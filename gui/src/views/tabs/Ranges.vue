<template>
  <div class="ranges">
    <b-field grouped group-multiline class="column">
      <div class="control is-flex">
        <b-switch v-model="filter.x">Executable</b-switch>
      </div>
      <div class="control is-flex">
        <b-switch v-model="filter.r">Readable</b-switch>
      </div>
      <div class="control is-flex">
        <b-switch v-model="filter.w">Writable</b-switch>
      </div>
      <div class="control is-flex">
        <b-select v-model="paginator">
          <option value="0">Don't paginate</option>
          <option value="50">50 per page</option>
          <option value="100">100 per page</option>
          <option value="200">20 per page</option>
        </b-select>
      </div>
    </b-field>

    <div ref="chart" class="chart"></div>
  </div>
</template>

<script>

import * as d3 from 'd3'
import { interpolateGreys } from 'd3-scale-chromatic'

import { mapGetters } from 'vuex'
import { GET_SOCKET } from '~/vuex/types'

import LoadingTab from '~/components/LoadingTab.vue'

export default {
  components: { LoadingTab },
  data() {
    return {
      list: [],
      loading: true,
      paginator: 100,
      filter: {
        x: true,
        w: false,
        r: true,
      },
      chart: null,
    }
  },
  computed: {
    ...mapGetters({
      socket: GET_SOCKET,
    })
  },
  watch: {
    socket(val, old) {
      this.load(socket)
    },
    list(val, old) {
      this.draw(val)
    },
    filter: {
      handler() {
        this.load()
      },
      deep: true
    },
  },
  methods: {
    draw(list) {
      let container = d3.select(this.$refs.chart)
      container.select('svg').remove()

      let svg = this.chart = container.append('svg')
        .attr('width', this.$refs.chart.clientWidth)
        .attr('height', this.$refs.chart.clientHeight)

      let filled = []
      let floor = 0
      let ceil = list.reduce((sum, range, index, arr) => {
        let { baseAddress, protection, size } = range
        let base = baseAddress.value
        if (sum > 0) {
          let gap = base - sum
          if (gap > 0) {
            filled.push({ base: sum, size: gap, type: 'gap'})
          }
          filled.push({ base , size, protection })
        } else {
          floor = base
        }
        return base + size
      }, 0)

      let width = svg.attr('width'), height = svg.attr('height'), groupHeight = height / 3
      let stack = d3.stack().keys(['base', 'size'])
      let scale = d3.scaleLinear().domain([floor, ceil]).range([0, width])

      let groups = svg.selectAll('g')
        .data('rwx'.split(''))
        .enter()
        .append('g')
        .attr('fill', '#ddd')
        .attr('x', 0)
        .attr('y', (d, i) => i * groupHeight)
        .attr('height', groupHeight)

      groups.selectAll('rect')
        .data(d => filled)
        .enter()
        .append('rect')
        .attr('fill', (d, j) => interpolateGreys(scale(d.base) / scale(ceil)))
        .attr('x', d => scale(d.base))
        .attr('height', groupHeight)
        .attr('width', d => scale(d.base + d.size) - scale(d.base))

    },
    onResize() {
      if (!this.chart)
        return

      this.chart
        .attr('width', this.$refs.chart.clientWidth)
        .attr('height', this.$refs.chart.clientHeight)

      this.draw(this.list)
    },
    load(socket) {
      let protection = Object.keys(this.filter)
        .filter(key => this.filter[key])
        .join('')

      this.loading = true
      this.socket.emit('ranges', { protection: protection }, ranges => {
        this.list = ranges
        this.loading = false
      })
    },
  },
  mounted() {
    window.addEventListener('resize', this.onResize)
    this.onResize()
    this.load(this.socket)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize)
  }
}
</script>

<style lang="scss">

.chart {
  width: 100%;
  height: 60px;
}
</style>
