export const extractDeliveryMen = (response) => {
  const candidate =
    response?.data?.data ||
    response?.data?.deliveryMen ||
    response?.data?.delivery_men ||
    response?.data?.drivers ||
    (Array.isArray(response?.data) ? response.data : null) ||
    response?.deliveryMen ||
    response?.delivery_men ||
    response?.drivers ||
    (Array.isArray(response) ? response : null);

  return Array.isArray(candidate) ? candidate : [];
};

export const getDeliveryManId = (driver) =>
  driver?.id || driver?._id || driver?.deliveryManId || driver?.courierId;

export const getDeliveryManName = (driver) =>
  driver?.name ||
  driver?.fullName ||
  driver?.deliveryManName ||
  driver?.user?.name ||
  driver?.profile?.name ||
  '';
