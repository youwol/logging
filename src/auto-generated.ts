
const runTimeDependencies = {
    "externals": {
        "rxjs": "^7.5.6",
        "@youwol/rx-vdom": "^1.0.1",
        "@youwol/rx-tree-views": "^0.3.1"
    },
    "includedInBundle": {}
}
const externals = {
    "rxjs": {
        "commonjs": "rxjs",
        "commonjs2": "rxjs",
        "root": "rxjs_APIv7"
    },
    "@youwol/rx-vdom": {
        "commonjs": "@youwol/rx-vdom",
        "commonjs2": "@youwol/rx-vdom",
        "root": "@youwol/rx-vdom_APIv1"
    },
    "@youwol/rx-tree-views": {
        "commonjs": "@youwol/rx-tree-views",
        "commonjs2": "@youwol/rx-tree-views",
        "root": "@youwol/rx-tree-views_APIv03"
    }
}
const exportedSymbols = {
    "rxjs": {
        "apiKey": "7",
        "exportedSymbol": "rxjs"
    },
    "@youwol/rx-vdom": {
        "apiKey": "1",
        "exportedSymbol": "@youwol/rx-vdom"
    },
    "@youwol/rx-tree-views": {
        "apiKey": "03",
        "exportedSymbol": "@youwol/rx-tree-views"
    }
}

const mainEntry : {entryFile: string,loadDependencies:string[]} = {
    "entryFile": "./lib/index.ts",
    "loadDependencies": []
}

const secondaryEntries : {[k:string]:{entryFile: string, name: string, loadDependencies:string[]}}= {
    "journal": {
        "entryFile": "./lib/journal/index.ts",
        "loadDependencies": [
            "rxjs",
            "@youwol/rx-vdom",
            "@youwol/rx-tree-views"
        ],
        "name": "journal"
    }
}

const entries = {
     '@youwol/logging': './lib/index.ts',
    ...Object.values(secondaryEntries).reduce( (acc,e) => ({...acc, [`@youwol/logging/${e.name}`]:e.entryFile}), {})
}
export const setup = {
    name:'@youwol/logging',
        assetId:'QHlvdXdvbC9sb2dnaW5n',
    version:'0.2.0-wip',
    shortDescription:"Logging for Youwol front apps",
    developerDocumentation:'https://platform.youwol.com/applications/@youwol/cdn-explorer/latest?package=@youwol/logging&tab=doc',
    npmPackage:'https://www.npmjs.com/package/@youwol/logging',
    sourceGithub:'https://github.com/youwol/logging',
    userGuide:'https://l.youwol.com/doc/@youwol/logging',
    apiVersion:'02',
    runTimeDependencies,
    externals,
    exportedSymbols,
    entries,
    secondaryEntries,
    getDependencySymbolExported: (module:string) => {
        return `${exportedSymbols[module].exportedSymbol}_APIv${exportedSymbols[module].apiKey}`
    },

    installMainModule: ({cdnClient, installParameters}:{
        cdnClient:{install:(unknown) => Promise<WindowOrWorkerGlobalScope>},
        installParameters?
    }) => {
        const parameters = installParameters || {}
        const scripts = parameters.scripts || []
        const modules = [
            ...(parameters.modules || []),
            ...mainEntry.loadDependencies.map( d => `${d}#${runTimeDependencies.externals[d]}`)
        ]
        return cdnClient.install({
            ...parameters,
            modules,
            scripts,
        }).then(() => {
            return window[`@youwol/logging_APIv02`]
        })
    },
    installAuxiliaryModule: ({name, cdnClient, installParameters}:{
        name: string,
        cdnClient:{install:(unknown) => Promise<WindowOrWorkerGlobalScope>},
        installParameters?
    }) => {
        const entry = secondaryEntries[name]
        if(!entry){
            throw Error(`Can not find the secondary entry '${name}'. Referenced in template.py?`)
        }
        const parameters = installParameters || {}
        const scripts = [
            ...(parameters.scripts || []),
            `@youwol/logging#0.2.0-wip~dist/@youwol/logging/${entry.name}.js`
        ]
        const modules = [
            ...(parameters.modules || []),
            ...entry.loadDependencies.map( d => `${d}#${runTimeDependencies.externals[d]}`)
        ]
        return cdnClient.install({
            ...parameters,
            modules,
            scripts,
        }).then(() => {
            return window[`@youwol/logging/${entry.name}_APIv02`]
        })
    },
    getCdnDependencies(name?: string){
        if(name && !secondaryEntries[name]){
            throw Error(`Can not find the secondary entry '${name}'. Referenced in template.py?`)
        }
        const deps = name ? secondaryEntries[name].loadDependencies : mainEntry.loadDependencies

        return deps.map( d => `${d}#${runTimeDependencies.externals[d]}`)
    }
}
