<template>
<b-breadcrumb v-if="breadcrumbs.length > 1" :items="breadcrumbs" style="background-color:white">
</b-breadcrumb>
</template>
<script>
import {BBreadcrumb} from 'bootstrap-vue'
//this component should be synched with the router, but 

export default {
    components:{BBreadcrumb},
    data(){
        return {
            staticRoutes: ['Submit sample', 'Submit Excel', 'ENA submission']
        }
    },
    watch:{
        $route (to){
            this.handleRouter(to)
        }
    },
    computed:{
        //simulate vue router, can't use the history mode of router for deployment issues
        breadcrumbs(){
            return this.$store.getters['portal/getState'].breadcrumbs
        }
    },
    methods: {
      mapRouter(router){
        var mappedRouter = {}
        Object.keys(router).filter(key => ['params','path','name'].includes(key)).forEach(key => {
            mappedRouter[key] = router[key]
        })
        return mappedRouter
      },
      getValue(route){
          //expect just one parameter
          if(route.params && Object.values(route.params).length === 1){
                return Object.values(route.params)[0]
          }
          else {
              return route.name
          }
      },
      handleRouter(to){
        const mappedTo = this.mapRouter(to)
        if(mappedTo.path === '/' ){
            this.$store.commit('portal/setField',{label: 'breadcrumbs', value: [{text: 'Home', to: mappedTo}]})
            return
        }
        const value = this.getValue(mappedTo) //value is the param or the name
        const index = this.breadcrumbs.findIndex(bcrumb => bcrumb.text === value)
        if(index !== -1){
            this.$store.commit('portal/sliceBreadcrumbs', {index: index})
        }else {
            this.$store.commit('portal/pushBreadcrumb', {text: value, to:mappedTo})
        }
      }
    }
}
</script>