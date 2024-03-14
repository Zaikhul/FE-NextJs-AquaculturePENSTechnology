import { getAllPonds } from "./get-all.ponds";
import { getAllNoQueryPonds } from "./get-all-noquery.ponds";
import { getPondById } from "./get-by-id.ponds";
import { getAllPondsByCityId } from "./get-by-city-id.ponds";
import { createPonds } from "./create.ponds";
import { deletePondsById } from "./delete-by-id.ponds";

const Ponds = {
  getAllPonds,
  createPonds,
  getAllNoQueryPonds,
  getAllPondsByCityId,
  deletePondsById,
  getPondById,
};

export { Ponds };
