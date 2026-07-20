/**
 * remark-subtext
 *
 * Adds Discord-style subtext to Markdown/MDX: a block that starts with `-# `
 * renders as small, muted text.
 *
 *   -# This is a small grey note.
 *
 * `-#` isn't a list (no space after the dash) or an ATX heading, so Markdown
 * parses the line as a normal paragraph. This plugin spots paragraphs whose
 * first text run begins with `-# `, strips the marker, and tags the paragraph
 * with `class="subtext"` (styled in BlogPost.astro).
 */
export default function remarkSubtext() {
  return (tree) => {
    for (const node of tree.children || []) {
      if (node.type !== 'paragraph' || !node.children || !node.children.length) continue;
      const first = node.children[0];
      if (first?.type !== 'text' || !/^-#\s+/.test(first.value)) continue;

      first.value = first.value.replace(/^-#\s+/, '');
      node.data = node.data || {};
      const props = node.data.hProperties || {};
      const classes = props.className ? [].concat(props.className) : [];
      classes.push('subtext');
      node.data.hProperties = { ...props, className: classes };
    }
  };
}
