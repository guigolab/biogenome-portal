---
layout: page
---
<div id="swagger-ui"></div>


<script>
import SwaggerUI from 'swagger-ui';
import 'swagger-ui/dist/swagger-ui.css';
export default {
    name: 'SwaggerUI',
    props: {
        specUrl: {
            type: String,
            required: true,
        },
    },
    mounted() {
        SwaggerUI({
            url: '/biogenome-portal/biogenome-portal-schema.yaml',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [SwaggerUI.presets.apis],
        });
    },
};
</script>

<style scoped>
#swagger-ui {
    margin: 20px 0;
}
</style>