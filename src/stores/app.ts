import { defineStore } from 'pinia'
import { ref } from 'vue';
import type { DecoratedTokenUtxo, DecoratedUtxo } from 'src/core/types';


export const useAppStore = defineStore('app-store', () => {

    const activeMinter = ref<DecoratedUtxo | undefined>()
    const activeToken = ref<DecoratedUtxo|undefined>()
    const activeUtxo = ref<DecoratedUtxo|undefined>()

    function setActiveMinter(minter: DecoratedUtxo | undefined) {
        activeMinter.value = minter
    }

    function setActiveToken(token: DecoratedTokenUtxo | undefined) {
        activeToken.value = token
    }

    function setActiveUtxo(utxo: DecoratedUtxo | undefined) {
        activeUtxo.value = utxo
    }
    
    return {
        activeMinter,
        setActiveMinter,
        activeUtxo,
        setActiveUtxo
    }
})