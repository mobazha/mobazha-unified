# Third-Party Notices

Mobazha Unified includes or bundles third-party software. Each component remains
under its own license; this repository's MPL-2.0 license does not replace those
terms.

The release workflow copies the applicable license texts into the
`third-party-licenses/` directory of binary archives and container images.

## Copyleft components

| Component                                                   | Version | License           | Source                                       |
| ----------------------------------------------------------- | ------- | ----------------- | -------------------------------------------- |
| OpenPGP.js (`openpgp`)                                      | 6.3.0   | LGPL-3.0-or-later | <https://github.com/openpgpjs/openpgpjs>     |
| rpc-websockets                                              | 9.3.2   | LGPL-3.0-only     | <https://github.com/elpheria/rpc-websockets> |
| libvips binaries distributed through `@img/sharp-libvips-*` | 8.17.x  | LGPL-3.0-or-later | <https://github.com/libvips/libvips>         |

These libraries are used without source modifications. Corresponding source is
available from the linked upstream projects and the exact resolved versions are
recorded in `pnpm-lock.yaml`. Recipients may replace or relink these libraries
subject to the applicable LGPL terms. Reverse engineering for debugging such
modifications is not prohibited by the Mobazha license or distribution terms.

## Reviewed metadata exception

`text-encoding-utf-8` 1.0.2 reports unknown license metadata to pnpm, but its
distributed `LICENSE.md` grants the Unlicense. The release workflow includes
that file alongside the other third-party notices.

Packages offering a permissive license alternative are used under that
permissive alternative, including JSZip under MIT.
