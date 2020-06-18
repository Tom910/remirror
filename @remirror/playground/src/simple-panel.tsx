import React, { FC, Fragment, useCallback, useMemo } from 'react';

import { REQUIRED_MODULES } from './execute';
import { isExtensionName, isPresetName } from './exports';
import { CodeOptions, ModuleSpec, RemirrorModules, RemirrorModuleStatus } from './interfaces';

export interface SimplePanelProps {
  options: CodeOptions;
  setOptions: (newOptions: CodeOptions) => void;
  onAdvanced: () => void;
  modules: RemirrorModules;
  addModule: (moduleName: string) => void;
  removeModule: (moduleName: string) => void;
}

interface ExtensionCheckboxProps {
  options: CodeOptions;
  setOptions: (newOptions: CodeOptions) => void;
  spec: ModuleSpec;
  hideModuleName: boolean;
  type: 'preset' | 'extension';
}

const ExtensionOrPresetCheckbox: FC<ExtensionCheckboxProps> = function (props) {
  const { options, setOptions, spec, hideModuleName, type } = props;
  const optionName: 'presets' | 'extensions' = `${type}s` as any;
  const list = options[optionName];
  const existingIndex = useMemo(
    () =>
      list.findIndex(
        (otherSpec) => otherSpec.module === spec.module && otherSpec.export === spec.export,
      ),
    [list, spec.export, spec.module],
  );
  const handleChange = useCallback(() => {
    if (existingIndex >= 0) {
      const collection = [...(options as any)[optionName]];
      collection.splice(existingIndex, 1);
      setOptions({
        ...options,
        [optionName]: collection,
      });
    } else {
      setOptions({
        ...options,
        [optionName]: [...(options as any)[optionName], spec],
      });
    }
  }, [existingIndex, options, setOptions, spec, optionName]);
  const text = hideModuleName
    ? spec.export
      ? spec.export
      : 'default'
    : `${spec.module}${spec.export ? ` : ${spec.export}` : ''}`;
  return (
    <div>
      <label>
        <input type='checkbox' checked={existingIndex >= 0} onChange={handleChange} /> {text}
      </label>
    </div>
  );
};

function stringTupleCompare(a: [string, string], b: [string, string]) {
  let s1 = a[0].localeCompare(b[0]);
  if (s1 !== 0) {
    return s1;
  }
  return a[1].localeCompare(b[1]);
}

export const SimplePanel: FC<SimplePanelProps> = function (props) {
  const { options, setOptions, onAdvanced, modules, addModule, removeModule } = props;

  const onAddModule = useCallback(() => {
    const moduleName = prompt('What module name do you wish to add?');
    if (moduleName) {
      addModule(moduleName);
    }
  }, [addModule]);

  /*
  const grouped = useMemo(() => {
    const groups: { [module: string]: ExtensionSpec[] } = {};
    for (const ext of knownExtensions) {
      if (!groups[ext.module]) {
        groups[ext.module] = [];
      }
      groups[ext.module].push(ext);
    }
    return groups;
  }, []);
  */
  //const modules = Object.keys(grouped).sort();

  let coreLoading: boolean = false;
  let coreErrors: [string, Error][] = [];
  const coreExtensions: [string, string][] = [];
  const corePresets: [string, string][] = [];
  const externalModules: [string, RemirrorModuleStatus][] = [];
  Object.keys(modules).forEach((moduleName) => {
    const mod = modules[moduleName];
    if (REQUIRED_MODULES.includes(moduleName)) {
      if (mod.loading) {
        coreLoading = true;
      } else if (mod.error) {
        coreErrors.push([moduleName, mod.error]);
      } else {
        Object.keys(mod.exports).forEach((exportName) => {
          if (isExtensionName(exportName)) {
            coreExtensions.push([moduleName, exportName]);
          } else if (isPresetName(exportName)) {
            corePresets.push([moduleName, exportName]);
          } else {
            /* NOOP */
          }
        });
      }
    } else {
      externalModules.push([moduleName, mod]);
    }
  });

  // Sort by extension name
  coreExtensions.sort((a, b) => a[1].localeCompare(b[1]));
  // Sort by extension name
  corePresets.sort((a, b) => a[1].localeCompare(b[1]));

  // Sort by module name
  externalModules.sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div>
      <button onClick={onAdvanced}>Enter advanced mode</button>

      {/* REMIRROR CORE */}
      <p>
        <strong>Remirror core</strong>{' '}
      </p>

      {/* loading */}
      {coreLoading ? (
        <p>
          <em>Loading</em>
        </p>
      ) : null}

      {/* errors */}
      {coreErrors.length
        ? coreErrors.map(([moduleName, error]) => (
            <p>
              Error loading <code>{moduleName}</code>: {error.message}
            </p>
          ))
        : null}

      {/* extensions */}
      {coreExtensions.map(([moduleName, exportName]) => (
        <ExtensionOrPresetCheckbox
          key={`${`${moduleName}|${exportName ?? 'default'}`}`}
          spec={{ module: moduleName, export: exportName }}
          options={options}
          setOptions={setOptions}
          hideModuleName
          type='extension'
        />
      ))}

      {/* TODO: some sensible divider */}
      <div style={{ height: '1rem' }} />

      {/* presets */}
      {corePresets.map(([moduleName, exportName]) => (
        <ExtensionOrPresetCheckbox
          key={`${`${moduleName}|${exportName ?? 'default'}`}`}
          spec={{ module: moduleName, export: exportName }}
          options={options}
          setOptions={setOptions}
          hideModuleName
          type='preset'
        />
      ))}

      {/* THIRD-PARTY */}
      {externalModules.map(([moduleName, mod]) => (
        <Fragment key={moduleName}>
          <p>
            <strong>{moduleName}</strong>{' '}
            {!REQUIRED_MODULES.includes(moduleName) ? (
              <button onClick={() => removeModule(moduleName)} title='remove'>
                -
              </button>
            ) : null}
          </p>
          {mod.loading ? (
            <em>Loading...</em>
          ) : mod.error ? (
            <em>An error occurred: {String(mod.error)}</em>
          ) : (
            Object.keys(mod.exports)
              .sort()
              .map((exportName) =>
                isExtensionName(exportName) ? (
                  <ExtensionOrPresetCheckbox
                    key={`${`${moduleName}|${exportName ?? 'default'}`}`}
                    spec={{ module: moduleName, export: exportName }}
                    options={options}
                    setOptions={setOptions}
                    hideModuleName
                    type='extension'
                  />
                ) : isPresetName(exportName) ? (
                  <ExtensionOrPresetCheckbox
                    key={`${`${moduleName}|${exportName ?? 'default'}`}`}
                    spec={{ module: moduleName, export: exportName }}
                    options={options}
                    setOptions={setOptions}
                    hideModuleName
                    type='preset'
                  />
                ) : null,
              )
          )}
        </Fragment>
      ))}

      <p>
        <button onClick={onAddModule}>+ Add module</button>
      </p>
    </div>
  );
};
