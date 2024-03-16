// import { serviceInstance } from "..";

// interface ILogin {
//   isNotify: boolean;
//   pondsName: string;
//   page: number;
//   limit: number;
//   provinceId: string;
//   cityId: string;
// }

// async function getAllNoQueryPonds(user: ILogin) {
//   const { data } = await serviceInstance(user.isNotify).get(
//     "/api/v1/ponds/all-ponds"
//   );
//   return data;
// }
// export { getAllNoQueryPonds };

import { serviceInstance } from "..";

interface ILogin {
  isNotify: boolean;
  pondsName: string;
  page: number;
  limit: number;
  provinceId: string;
  cityId: string;
}

async function getAllNoQueryPonds(user: ILogin) {
  const { data } = await serviceInstance(user.isNotify).get(
    "/api/v1/ponds/all-ponds?pondsName=" +
      user.pondsName +
      "&page=" +
      user.page +
      "&limit=" +
      user.limit +
      "&provinceId=" +
      user.provinceId +
      "&cityId=" +
      user.cityId
  );
  return data;
}
export { getAllNoQueryPonds };
