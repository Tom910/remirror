import { isExtensionValid } from '@remirror/test-fixtures';

import { DocExtension } from '../..';

test('is valid', () => {
  expect(isExtensionValid(DocExtension, {}));
});