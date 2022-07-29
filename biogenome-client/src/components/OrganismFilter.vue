<template>
    <div class="row">
        <div class="flex">
            <div class="row">
                <div class="flex lg6">
                    <va-select
                        label="search field"
                        v-model="orgStore.query.filter_option"
                        :options="['tolid','taxid','common_name']"
                        style="padding:10px"
                        :disabled="Boolean(orgStore.query.filter)"
                        clearable
                    />
                </div>
                <div class="flex lg6">
                    <va-input
                        label="filter"
                        placeholder="search organism"
                        v-model="orgStore.query.filter"
                        style="padding:10px"
                    >
                        <template #appendInner>
                            <va-icon
                                name="search"
                            />
                        </template>
                    </va-input>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup>
import {organisms} from '../stores/organisms'
const orgStore = organisms()
</script>