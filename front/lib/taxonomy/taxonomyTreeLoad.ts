/**
 * Rank derivation helpers for the taxonomy tree UI.
 *
 * All logic lives in `taxonomyTreePipeline`; this module re-exports the public
 * API so existing import paths in consumers keep working without changes.
 */
export {
   countNestedTreeLeaves,
   buildTruncationLookups,
   ranksWithPositiveLeaves,
   allowedRanksFromLookups,
   collectRanksPresentInSubtree,
   rankFilterOptionsForSubtree,
   pickSubtreeApiRank,
} from '@/lib/taxonomy/taxonomyTreePipeline'
