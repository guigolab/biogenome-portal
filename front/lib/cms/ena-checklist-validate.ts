/** ENA checklist field shapes (subset used by publish-biosample UI). */

export type EnaChecklistField = {
   name: { text: string }
   label?: { text: string }
   mandatory?: { text: string }
   description?: { text: string }
   field_type: {
      text_field?: { regex_value?: string | { text: string } }
      text_area_field?: Record<string, unknown>
      text_choice_field?: {
         text_value: { value: { text: string } }[] | { value: { text: string } }
      }
   }
   units?: { unit: { text: string } }
}

export function getChoiceOptions(field: EnaChecklistField): string[] {
   const tv = field.field_type.text_choice_field?.text_value
   if (!tv) return []
   return Array.isArray(tv) ? tv.map((o) => o.value.text) : [tv.value.text]
}

function textFieldRegexPattern(field: EnaChecklistField): string | undefined {
   const rv = field.field_type.text_field?.regex_value
   if (rv === undefined) return undefined
   return typeof rv === 'string' ? rv : rv.text
}

/** @returns error message or null if valid */
export function validateEnaChecklistField(
   field: EnaChecklistField,
   raw: string | string[] | undefined,
): string | null {
   const name = field.name.text
   const v = raw === undefined ? '' : Array.isArray(raw) ? raw.join(',') : String(raw)
   const trimmed = v.trim()
   const req = field.mandatory?.text === 'mandatory'

   if (field.field_type.text_choice_field) {
      if (req && !trimmed) return `${name} is mandatory, fill it`
      return null
   }
   if (field.field_type.text_area_field) {
      if (req && !trimmed) return `${name} is mandatory, please fill it.`
      return null
   }
   if (field.field_type.text_field) {
      if (req && !trimmed) return `${name} is mandatory, please fill it.`
      const pattern = textFieldRegexPattern(field)
      if (trimmed && pattern) {
         try {
            const re = new RegExp(pattern)
            if (!re.test(v)) return `Invalid input. Expected format: ${pattern}`
         } catch {
            // ignore invalid server-provided patterns
         }
      }
      return null
   }
   return null
}

export function getGroupFieldsList(group: { field: EnaChecklistField | EnaChecklistField[] }): EnaChecklistField[] {
   const f = group.field
   if (!f) return []
   return Array.isArray(f) ? f : [f]
}

export function validateEnaChecklistGroup(
   group: { field: EnaChecklistField | EnaChecklistField[] },
   characterics: Record<string, string | string[]>,
): Record<string, string> {
   const out: Record<string, string> = {}
   for (const field of getGroupFieldsList(group)) {
      const key = field.name.text
      const msg = validateEnaChecklistField(field, characterics[key])
      if (msg) out[key] = msg
   }
   return out
}

export function validateEntireEnaChecklist(
   checklist: Record<string, unknown>,
   characterics: Record<string, string | string[]>,
): Record<string, string> {
   const desc = checklist.descriptor as Record<string, unknown> | undefined
   const groups = desc?.field_group
   if (!groups) return {}
   const list = (Array.isArray(groups) ? groups : [groups]) as { field: EnaChecklistField | EnaChecklistField[] }[]
   const out: Record<string, string> = {}
   for (const g of list) {
      Object.assign(out, validateEnaChecklistGroup(g, characterics))
   }
   return out
}
