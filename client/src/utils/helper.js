import {Parser} from 'xml2js'


export function xmlParser(xmlData){
    return new Parser().parseStringPromise(xmlData)
}

export function mapCheckListFields(options) {
    const object = {};
    for (let x = 0; x < options.fields.length; x++) {
      const field = options.fields[x];
      object[field] = {
        get() {
          if(this.$store.state.form[options.base][field].unit){
            return this.$store.state.form[options.base][field].text
          }else{
            return this.$store.state.form[options.base][field]
          }
        },
        set(value) {
            this.$store.commit(options.mutation, {value: value, label:field})
        }
      };
    }
    return object
}

export function mapFields(options) {
    const object = {}
    for (let x = 0; x < options.fields.length; x++) {
      const field = options.fields[x];
      object[field] = {
        get() {
          return this.$store.state[options.module][field];
        },
        set(value) {
          this.$store.commit(options.mutation, {value: value, label: field});
        }
      };
    }
    return object;
}
export function showConfirmationModal(bvModal,description){
    // return a promise
    return bvModal.msgBoxConfirm(description, {
        title: 'Confirm',
        // size: 'sm',
        // buttonSize: 'sm',
        okVariant: 'danger',
        okTitle: 'Yes',
        cancelTitle: 'No',
        footerClass: 'p-2',
        hideHeaderClose: false,
        centered: true
        })
}