import { defineStore } from 'pinia'
import { EBISample, EBISampleCharacteristic } from '../data/types'
import EBIService from '../services/EBIService';
import { useToast } from 'vuestic-ui'
import { AxiosError } from 'axios';

function convertToSampleCharacteristic(value: string, ontologyTerm?: string, unit?: string): EBISampleCharacteristic[] {

    const characteristic: EBISampleCharacteristic = { text: value };

    if (ontologyTerm) {
        characteristic.ontologyTerms = [ontologyTerm];
    }

    if (unit) {
        characteristic.unit = unit;
    }

    return [characteristic];
}

function mapValue(v: string[] | string) {
    if (Array.isArray(v)) {
        if (v.length === 1) return v[0]
        return v.join(',')
    } return v
}

function getUnit(key: string, fields: { name: string, unit?: string }[]) {
    const field = fields.find(({ name }) => name === key)
    if (field && field.unit) return field.unit
}

const AUTH_KEY = 'ena_auth'
const isAuth = localStorage.getItem(AUTH_KEY) === 'true'

export const useSampleStore = defineStore('sample', {
    state: () => {
        return {
            characterics: {} as Record<string, any>,
            taxid: "",
            yesterdayISO: () => new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
            scientificName: "",
            sampleIdentifier: "",
            checklist: "",
            isAuthenticated: isAuth,
            sampleDerivedFrom: "",
            loading: false,
            showModal: false,
            validationErrors: [] as string[],
            ebiValid: false,
            toast: useToast().init,
            responseMessage: null as null | string
        }
    },

    actions: {
        resetForm() {
            this.characterics = {}
        },
        async loginToENA(username: string, password: string) {
            try {
                const { data } = await EBIService.loginToENA(username, password)
                this.toast({ color: 'success', message: 'Log in to ENA successfull' })
                localStorage.setItem(AUTH_KEY, 'true');
                this.isAuthenticated = true
            } catch (error) {
                const axiosError = error as AxiosError
                const resp = axiosError.response?.data as any
                this.toast({ color: 'danger', message: resp.message ? resp.message : resp as string })
                this.isAuthenticated = false
                localStorage.setItem(AUTH_KEY, 'false')
            }
        },
        async checkUserIsLoggedIn() {
            if (!this.isAuthenticated) return
            try {
                const { data } = await EBIService.checkENACookie()
                localStorage.setItem(AUTH_KEY, 'true');
                this.isAuthenticated = true
            } catch (error) {
                this.isAuthenticated = false
                localStorage.setItem(AUTH_KEY, 'false');
            }
        },
        mapFormToEBIPayload(checklistFields: { name: string, unit?: string }[]) {
            //convert form to biosamples payload
            return {
                Organism: convertToSampleCharacteristic(this.scientificName, this.taxid),
                checklist: convertToSampleCharacteristic(this.checklist),
                ...Object.fromEntries(Object.entries(this.characterics).filter(([k, v]) => v)
                    .map(([k, v]) => [k, convertToSampleCharacteristic(mapValue(v), undefined, getUnit(k, checklistFields))])
                )
            }
        },
        async submitSample(checklistFields: { name: string, unit?: string }[]) {
            if (!this.isAuthenticated) return
            const characteristics = this.mapFormToEBIPayload(checklistFields)
            window.scrollTo({ top: 0, behavior: 'smooth' });
            try {
                this.loading = true
                const { data } = await EBIService.submitBiosample({ name: this.sampleIdentifier, taxid: this.taxid, release: this.yesterdayISO(), characteristics })
                this.responseMessage = data
                this.showModal = true
            } catch (error) {
                const axiosError = error as AxiosError

                const responseData = axiosError.response?.data
                if (responseData && Array.isArray(responseData)) {
                    this.validationErrors = responseData.map((err: { dataPath: string, errors: string[] }) => (`${err.dataPath}: ${err.errors.join('; ')}`)).flat()
                }
                this.toast({ color: 'danger', message: 'Validation Error' })
            } finally {
                this.loading = false
            }
        },
    },
})
