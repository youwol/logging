import shutil
from pathlib import Path

from youwol.pipelines.pipeline_typescript_weback_npm import Template, PackageType, Dependencies, \
    RunTimeDeps, generate_template, Bundles, MainModule, AuxiliaryModule
from youwol.utils import parse_json

folder_path = Path(__file__).parent

pkg_json = parse_json(folder_path / 'package.json')

externals = {
    'rxjs': '^7.5.6',
    '@youwol/rx-vdom': '^1.0.1',
    '@youwol/rx-tree-views': '^0.3.1',
}

template = Template(
    path=folder_path,
    type=PackageType.Library,
    name=pkg_json['name'],
    version=pkg_json['version'],
    shortDescription=pkg_json['description'],
    author=pkg_json['author'],
    dependencies=Dependencies(
        runTime=RunTimeDeps(
            externals=externals
        ),
        devTime={
            # Included for type definitions
            "@youwol/webpm-client": "^3.0.0"
        }
    ),
    bundles=Bundles(
        mainModule=MainModule(
            entryFile="./lib/index.ts",
            loadDependencies=[]
        ),
        auxiliaryModules=[
            AuxiliaryModule(
                name='journal',
                entryFile="./lib/journal/index.ts",
                loadDependencies=list(externals.keys())
            )
        ]
    ),
    userGuide=True
)

generate_template(template)

shutil.copyfile(
    src=folder_path / '.template' / 'src' / 'auto-generated.ts',
    dst=folder_path / 'src' / 'auto-generated.ts'
)
for file in [
    'README.md',
    '.gitignore',
    '.npmignore',
    '.prettierignore',
    'LICENSE',
    'package.json',
    # 'tsconfig.json', need to reference rx-vdom-config.ts
    'webpack.config.ts'
]:
    shutil.copyfile(
        src=folder_path / '.template' / file,
        dst=folder_path / file
    )

